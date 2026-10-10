<#
.SYNOPSIS
  Builds a signed Aura360 Android release (APK and/or AAB) locally with the Gradle wrapper. No EAS Build.

.DESCRIPTION
  Preflight checks -> Gradle (:app:assembleRelease / :app:bundleRelease) -> artifact + signature
  verification -> report. Never generates keys, never runs `expo prebuild`, never prints secrets.

  Production signing credentials come from mobile/keystore.properties (gitignored) and/or the
  AURA360_UPLOAD_* environment variables; see keystore.properties.example and scripts/README.md.
  Without them the build is refused unless -AllowDebugSigning is given, and any such artifact is
  reported as DEBUG-SIGNED (not distributable).

  Exit codes: 0 success | 1 usage/unexpected | 2 preflight failed | 3 Gradle build failed |
              4 artifact or signature verification failed

.PARAMETER Target
  apk | aab | all (default: all). APK and AAB are built sequentially and reported separately.

.PARAMETER OutputDir
  Optional. After a target is built AND verified, copy it here as
  aura360-<versionName>-<versionCode>-release.<ext>. Never touched on failure.

.PARAMETER VersionCode
  Optional Android versionCode override (Play requires it to increase with every upload).
  Without it the value generated into android/app/build.gradle is used.

.PARAMETER Architectures
  Optional subset of ABIs to compile, e.g. arm64-v8a (much faster; fine for a personal-phone APK).
  Default: whatever android/gradle.properties says (all four).

.PARAMETER AllowDebugSigning
  Permit building when no production signing is configured. Output is labelled DEBUG-SIGNED.

.PARAMETER SkipApiUrlCheck
  Skip the EXPO_PUBLIC_API_URL sanity check (errors become warnings).

.PARAMETER CheckOnly
  Run the preflight checks and exit without building.

.EXAMPLE
  .\scripts\build-release.ps1 -Target apk
  .\scripts\build-release.ps1 -Target aab -VersionCode 2
  .\scripts\build-release.ps1 -Target all -OutputDir C:\Releases\aura360
  .\scripts\build-release.ps1 -CheckOnly
#>
[CmdletBinding()]
param(
    [ValidateSet('apk', 'aab', 'all')]
    [string]$Target = 'all',

    [string]$OutputDir,

    [ValidateRange(1, 2100000000)]
    [int]$VersionCode,

    [string[]]$Architectures,

    [switch]$AllowDebugSigning,
    [switch]$SkipApiUrlCheck,
    [switch]$CheckOnly
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = 'Stop'

# `powershell -File ... -Architectures a,b` delivers one "a,b" string; accept both forms.
if ($Architectures) { $Architectures = @($Architectures | ForEach-Object { $_ -split ',' } | ForEach-Object { $_.Trim() } | Where-Object { $_ }) }

# ---------------------------------------------------------------------------------------------
# Paths (all relative to this script, so it works from the repo root or from mobile/)
# ---------------------------------------------------------------------------------------------
$MobileDir     = Split-Path -Parent $PSScriptRoot
$AndroidDir    = Join-Path $MobileDir 'android'
$GradlewBat    = Join-Path $AndroidDir 'gradlew.bat'
$AppGradle     = Join-Path $AndroidDir 'app\build.gradle'
$InitScript    = Join-Path $PSScriptRoot 'release-signing.init.gradle'
$PackageJson   = Join-Path $MobileDir 'package.json'
$AppJson       = Join-Path $MobileDir 'app.json'
$KeystoreProps = Join-Path $MobileDir 'keystore.properties'
$RnVersions    = Join-Path $MobileDir 'node_modules\react-native\gradle\libs.versions.toml'
$AllowedAbis   = @('armeabi-v7a', 'arm64-v8a', 'x86', 'x86_64')

$HasVersionCode = $PSBoundParameters.ContainsKey('VersionCode')
$script:OutputFull = $null
$script:SigningMarkers = @()
$script:Errors   = New-Object System.Collections.Generic.List[string]
$script:Warnings = New-Object System.Collections.Generic.List[string]

function Add-Err([string]$m)  { $script:Errors.Add($m);   Write-Host "  [FAIL] $m" -ForegroundColor Red }
function Add-Warn([string]$m) { $script:Warnings.Add($m); Write-Host "  [WARN] $m" -ForegroundColor Yellow }
function Write-Ok([string]$m) { Write-Host "  [ OK ] $m" -ForegroundColor Green }
function Write-Step([string]$m) { Write-Host ""; Write-Host "== $m" -ForegroundColor Cyan }

# ---------------------------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------------------------
function Join-NativeArgs([string[]]$a) {
    ($a | ForEach-Object {
        if ($_ -match '[\s"]') { '"' + ($_ -replace '"', '\"') + '"' } else { $_ }
    }) -join ' '
}

# Runs a native program, capturing stdout/stderr without PowerShell turning stderr into errors.
# $Env values are set for the child only, so secrets never enter this session's environment.
function Invoke-Capture([string]$File, [string[]]$Arguments, [hashtable]$Env = @{}) {
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = $File
    $psi.Arguments = Join-NativeArgs $Arguments
    $psi.UseShellExecute = $false
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.CreateNoWindow = $true
    foreach ($k in $Env.Keys) { $psi.EnvironmentVariables[$k] = [string]$Env[$k] }
    $p = [System.Diagnostics.Process]::Start($psi)
    $stdout = $p.StandardOutput.ReadToEndAsync()
    $stderr = $p.StandardError.ReadToEndAsync()
    $p.WaitForExit()
    [pscustomobject]@{ ExitCode = $p.ExitCode; StdOut = $stdout.Result; StdErr = $stderr.Result }
}

# Java .properties subset: key=value, '#'/'!' comments. Returns @{} for a missing file.
function Read-Properties([string]$Path) {
    $h = @{}
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { return $h }
    foreach ($line in [System.IO.File]::ReadAllLines($Path)) {
        $t = $line.Trim()
        if ($t -eq '' -or $t.StartsWith('#') -or $t.StartsWith('!')) { continue }
        $i = $t.IndexOfAny([char[]]@('=', ':'))
        if ($i -lt 1) { continue }
        $h[$t.Substring(0, $i).Trim()] = $t.Substring($i + 1).Trim()
    }
    $h
}

function Get-TomlValue([string]$Path, [string]$Key) {
    if (-not (Test-Path -LiteralPath $Path)) { return $null }
    $m = Select-String -Path $Path -Pattern ('^\s*' + [regex]::Escape($Key) + '\s*=\s*"([^"]+)"') | Select-Object -First 1
    if ($m) { $m.Matches[0].Groups[1].Value } else { $null }
}

function Get-ZipEntryNames([string]$Path) {
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $z = [System.IO.Compression.ZipFile]::OpenRead($Path)
    try { @($z.Entries | ForEach-Object { $_.FullName }) } finally { $z.Dispose() }
}

function Format-Size([long]$bytes) { '{0:N1} MB ({1:N0} bytes)' -f ($bytes / 1MB), $bytes }

function Find-SdkDir {
    $lp = Read-Properties (Join-Path $AndroidDir 'local.properties')
    if ($lp.ContainsKey('sdk.dir')) { return ($lp['sdk.dir'] -replace '\\\\', '\' -replace '\\:', ':') }
    foreach ($n in 'ANDROID_HOME', 'ANDROID_SDK_ROOT') {
        $v = [Environment]::GetEnvironmentVariable($n)
        if ($v) { return $v }
    }
    $null
}

function Find-JavaTool([string]$Name) {
    if ($env:JAVA_HOME) {
        $p = Join-Path $env:JAVA_HOME "bin\$Name.exe"
        if (Test-Path -LiteralPath $p) { return $p }
    }
    $c = Get-Command $Name -ErrorAction SilentlyContinue
    if ($c) { return $c.Source }
    $null
}

function Normalize-Fingerprint([string]$s) { ($s -replace '[^0-9A-Fa-f]', '').ToLowerInvariant() }

# ---------------------------------------------------------------------------------------------
# Preflight
# ---------------------------------------------------------------------------------------------
$Sdk = [ordered]@{ Dir = $null; BuildTools = $null; ApkSigner = $null }
$Signing = @{ Configured = $false; Fingerprint = $null; Source = $null; PropsFile = $null }
$Info = @{ ApplicationId = $null; VersionName = $null; VersionCode = $null }

function Test-Toolchain {
    Write-Step 'Toolchain'

    foreach ($tool in 'node', 'npm') {
        # Resolve a real executable (npm on PATH may otherwise resolve to npm.ps1 or an extensionless shim).
        $cmd = @("$tool.exe", "$tool.cmd") | ForEach-Object { Get-Command $_ -ErrorAction SilentlyContinue } | Select-Object -First 1
        if ($cmd) {
            $r = Invoke-Capture $cmd.Source @('--version')
            Write-Ok "$tool $($r.StdOut.Trim())"
        } else {
            Add-Err "$tool was not found on PATH. Install Node.js (LTS) from https://nodejs.org and reopen the terminal."
        }
    }

    $java = Find-JavaTool 'java'
    if (-not $java) {
        Add-Err 'Java was not found (JAVA_HOME unset and no java on PATH). Install a JDK 17+ (e.g. Temurin 17) and set JAVA_HOME.'
    } else {
        $r = Invoke-Capture $java @('-version')
        $text = $r.StdErr + $r.StdOut
        if ($text -match 'version "(\d+)(?:\.(\d+))?') {
            $major = [int]$Matches[1]
            if ($major -eq 1 -and $Matches[2]) { $major = [int]$Matches[2] }
            if ($major -lt 17) {
                Add-Err "Java $major found; Gradle 9.3 + Android Gradle Plugin 8.12 need JDK 17 or newer (JAVA_HOME=$env:JAVA_HOME)."
            } else {
                Write-Ok "Java $major ($java)"
            }
        } else {
            Add-Warn "Could not determine the Java version from '$java'."
        }
    }
}

function Test-AndroidSdk {
    Write-Step 'Android SDK'
    $dir = Find-SdkDir
    if (-not $dir) {
        Add-Err 'Android SDK location not set. Set ANDROID_HOME (or sdk.dir in mobile/android/local.properties) to your SDK folder, e.g. via Android Studio > SDK Manager.'
        return
    }
    if (-not (Test-Path -LiteralPath $dir -PathType Container)) {
        Add-Err "Android SDK directory does not exist: $dir. Install the Android SDK (Android Studio > SDK Manager, or command-line tools) or correct ANDROID_HOME."
        return
    }
    $Sdk.Dir = $dir
    Write-Ok "SDK directory: $dir"

    $compileSdk = Get-TomlValue $RnVersions 'compileSdk'
    $buildTools = Get-TomlValue $RnVersions 'buildTools'
    $ndk        = Get-TomlValue $RnVersions 'ndkVersion'
    if (-not $compileSdk) { Add-Warn 'Could not read required SDK versions from react-native libs.versions.toml (is npm install done?).'; return }

    $missing = @()
    if (-not (Test-Path (Join-Path $dir "platforms\android-$compileSdk")))  { $missing += "platforms;android-$compileSdk" }
    if (-not (Test-Path (Join-Path $dir "build-tools\$buildTools")))        { $missing += "build-tools;$buildTools" }
    if (-not (Test-Path (Join-Path $dir "ndk\$ndk")))                       { $missing += "ndk;$ndk" }
    if ($missing.Count -gt 0) {
        Add-Warn ("Missing SDK components: " + ($missing -join ', ') + ". Gradle will try to download them on first build (needs network and accepted licenses: sdkmanager --licenses). Install them up front with sdkmanager or Android Studio to avoid surprises.")
    } else {
        Write-Ok "Required components present (platform $compileSdk, build-tools $buildTools, NDK $ndk)"
    }

    # apksigner for signature verification: prefer the project's build-tools version, else the newest.
    $btRoot = Join-Path $dir 'build-tools'
    if (Test-Path $btRoot) {
        $cands = @()
        if ($buildTools) { $cands += (Join-Path $btRoot $buildTools) }
        $cands += @(Get-ChildItem $btRoot -Directory | Sort-Object { try { [version]$_.Name } catch { [version]'0.0' } } -Descending | ForEach-Object { $_.FullName })
        foreach ($c in $cands) {
            if (Test-Path (Join-Path $c 'apksigner.bat')) {
                $Sdk.BuildTools = $c
                $Sdk.ApkSigner  = Join-Path $c 'apksigner.bat'
                break
            }
        }
    }
    if (-not $Sdk.ApkSigner) { Add-Warn 'apksigner not found in the SDK build-tools yet; it appears once build-tools are installed. APK signatures cannot be verified until then.' }
}

function Test-ProjectFiles {
    Write-Step 'Project'
    $errorsBefore = $script:Errors.Count
    foreach ($f in @($PackageJson, $AppJson, $GradlewBat, $AppGradle, $InitScript, (Join-Path $AndroidDir 'settings.gradle'), (Join-Path $AndroidDir 'gradle\wrapper\gradle-wrapper.properties'))) {
        if (-not (Test-Path -LiteralPath $f -PathType Leaf)) {
            $rel = $f.Substring($MobileDir.Length).TrimStart('\')
            Add-Err "Required file missing: mobile\$rel. (If android\ is missing, generating it needs a deliberate 'npx expo prebuild --platform android'; this script never does that.)"
        }
    }
    if (-not (Test-Path (Join-Path $MobileDir 'node_modules\expo\package.json'))) {
        Add-Err "node_modules is missing or incomplete. Run 'npm install' in mobile\ first."
    }
    if ($script:Errors.Count -gt $errorsBefore) { return }
    Write-Ok 'Gradle wrapper, Android project and node_modules present'

    $gradleText = [System.IO.File]::ReadAllText($AppGradle)
    if ($gradleText -match "applicationId\s+['""]([^'""]+)['""]") { $Info.ApplicationId = $Matches[1] }
    if ($gradleText -match 'versionCode\s+(\d+)')               { $Info.VersionCode   = $Matches[1] }
    if ($gradleText -match "versionName\s+['""]([^'""]+)['""]") { $Info.VersionName   = $Matches[1] }
    if ($HasVersionCode) { $Info.VersionCode = [string]$VersionCode }

    $app = (Get-Content -Raw -LiteralPath $AppJson | ConvertFrom-Json).expo
    $expectedPkg = $app.android.package
    if ($Info.ApplicationId -ne $expectedPkg) {
        Add-Err "Native applicationId '$($Info.ApplicationId)' does not match app.json android.package '$expectedPkg'. The native project is stale; fix with a deliberate prebuild."
    } else {
        Write-Ok "Package ID $($Info.ApplicationId) matches app.json"
    }
    if ($Info.VersionName -ne $app.version) {
        Add-Warn "Native versionName '$($Info.VersionName)' differs from app.json version '$($app.version)'. The native project predates the version bump (prebuild would refresh it)."
    } else {
        Write-Ok "Version $($Info.VersionName) matches app.json"
    }
    Write-Ok "versionCode $($Info.VersionCode)$(if ($HasVersionCode) { ' (override)' })"
    if ($Info.VersionCode -eq '1' -and -not $HasVersionCode) {
        Add-Warn 'versionCode is 1. Google Play rejects an upload whose versionCode was already used; pass -VersionCode <n> for later releases (eas.json uses remote versioning, which local builds do not consume).'
    }

    if ($Architectures) {
        $bad = @($Architectures | Where-Object { $AllowedAbis -notcontains $_ })
        if ($bad.Count -gt 0) { Add-Err ("Unknown ABI(s): " + ($bad -join ', ') + ". Allowed: " + ($AllowedAbis -join ', ')) }
        elseif ($Target -ne 'apk') { Add-Warn 'Restricting ABIs for an AAB means Play will not serve other architectures. Normally leave -Architectures unset for the AAB.' }
    }

    $lp = Get-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem' -Name LongPathsEnabled -ErrorAction SilentlyContinue
    if ($lp -and $lp.LongPathsEnabled -ne 1) {
        Add-Warn 'Windows long paths are disabled; native (CMake/Ninja) steps can fail with path-too-long errors. If that happens, enable LongPathsEnabled or move the repo to a shorter path.'
    }
}

function Test-Signing {
    Write-Step 'Release signing'
    $cfg = @{}
    $sources = @()
    $file = Read-Properties $KeystoreProps
    if ($file.Count -gt 0) {
        $sources += 'keystore.properties'
        $Signing.PropsFile = $KeystoreProps
        foreach ($k in 'storeFile', 'storePassword', 'keyAlias', 'keyPassword') { if ($file[$k]) { $cfg[$k] = $file[$k] } }
    }
    $envMap = @{ storeFile = 'AURA360_UPLOAD_STORE_FILE'; storePassword = 'AURA360_UPLOAD_STORE_PASSWORD'; keyAlias = 'AURA360_UPLOAD_KEY_ALIAS'; keyPassword = 'AURA360_UPLOAD_KEY_PASSWORD' }
    $storeFromEnv = $false
    foreach ($k in $envMap.Keys) {
        $v = [Environment]::GetEnvironmentVariable($envMap[$k])
        if ($v) {
            $cfg[$k] = $v
            if ($k -eq 'storeFile') { $storeFromEnv = $true }
            if ($sources -notcontains 'environment') { $sources += 'environment' }
        }
    }

    if ($cfg.Count -eq 0) {
        if ($AllowDebugSigning) {
            Add-Warn 'No production signing configured. -AllowDebugSigning given: artifacts will be signed with the DEBUG key and labelled DEBUG-SIGNED. Do not distribute them.'
        } else {
            Add-Err 'No production signing configured, so a distributable release cannot be built. Create an upload keystore and mobile\keystore.properties (see scripts\README.md), or pass -AllowDebugSigning for a local test build only.'
        }
        return
    }

    $missing = @('storeFile', 'storePassword', 'keyAlias', 'keyPassword' | Where-Object { -not $cfg.ContainsKey($_) })
    if ($missing.Count -gt 0) {
        Add-Err ("Incomplete signing configuration (from " + ($sources -join ' + ') + "); missing: " + ($missing -join ', '))
        return
    }

    $raw = $cfg['storeFile']
    if ($raw -match '(?<!\\)\\(?!\\)') {
        Add-Err 'storeFile contains single backslashes; in a .properties file use forward slashes (C:/keys/upload.jks) or doubled backslashes.'
        return
    }
    $store = $raw -replace '\\\\', '\'
    if (-not [System.IO.Path]::IsPathRooted($store)) {
        if ($storeFromEnv) { Add-Err 'AURA360_UPLOAD_STORE_FILE must be an absolute path.'; return }
        $store = Join-Path $MobileDir $store   # relative paths in keystore.properties resolve against mobile/
    }
    if (-not (Test-Path -LiteralPath $store -PathType Leaf)) {
        Add-Err "Keystore file not found: $store"
        return
    }
    $store = (Resolve-Path -LiteralPath $store).Path

    $keytool = Find-JavaTool 'keytool'
    if (-not $keytool) { Add-Err 'keytool not found (needs a JDK); cannot validate the keystore.'; return }

    # Password goes to keytool through a child-only env var, never on a command line or in the log.
    $r = Invoke-Capture $keytool @('-list', '-v', '-keystore', $store, '-alias', $cfg['keyAlias'], '-storepass:env', 'AURA360_KT_PASS', '-J-Duser.language=en') @{ AURA360_KT_PASS = $cfg['storePassword'] }
    if ($r.ExitCode -ne 0) {
        $why = if (($r.StdOut + $r.StdErr) -match 'password was incorrect|Keystore was tampered') { 'the store password is wrong' }
               elseif (($r.StdOut + $r.StdErr) -match 'does not exist') { "alias '$($cfg['keyAlias'])' does not exist in the keystore" }
               else { 'keytool could not read it' }
        Add-Err "Keystore could not be opened: $why."
        return
    }
    if ($r.StdOut -match '(?m)^\s*SHA256:\s*([0-9A-Fa-f:]+)') {
        $Signing.Fingerprint = Normalize-Fingerprint $Matches[1]
    }
    if ($r.StdOut -match 'CN=Android Debug') {
        Add-Err 'The configured keystore holds the Android DEBUG certificate. Production releases must use your own upload keystore.'
        return
    }
    $Signing.Configured = $true
    $Signing.Source = ($sources -join ' + ')
    $shown = if ($Signing.Fingerprint) { ($Signing.Fingerprint -replace '(..)(?!$)', '$1:').ToUpperInvariant() } else { 'unknown' }
    Write-Ok "Production signing configured from $($Signing.Source); keystore opens, alias found"
    Write-Ok "Certificate SHA-256: $shown"
}

function Test-ApiUrl {
    Write-Step 'Runtime API URL (bundled into the release JS)'
    $name = 'EXPO_PUBLIC_API_URL'
    $val = [Environment]::GetEnvironmentVariable($name)
    $from = 'process environment'
    if (-not $val) {
        # Same precedence Expo uses for a production bundle; existing process env always wins.
        foreach ($f in '.env.production.local', '.env.local', '.env.production', '.env') {
            $p = Join-Path $MobileDir $f
            if (Test-Path -LiteralPath $p) {
                $m = Select-String -LiteralPath $p -Pattern ('^\s*' + $name + '\s*=\s*(.*)$') | Select-Object -First 1
                if ($m) { $val = $m.Matches[0].Groups[1].Value.Trim().Trim('"').Trim("'"); $from = $f; break }
            }
        }
    }
    $report = { param($msg) if ($SkipApiUrlCheck) { Add-Warn "$msg (check skipped by -SkipApiUrlCheck)" } else { Add-Err $msg } }

    if (-not $val) {
        Add-Warn 'EXPO_PUBLIC_API_URL is not set. The release app will default to the emulator loopback (http://10.0.2.2:3000, see src/lib/config.ts) until the user enters a server on the sign-in screen. Set it before building if the app should ship pointed at your server.'
        return
    }
    $uri = $null
    if (-not [System.Uri]::TryCreate($val, [System.UriKind]::Absolute, [ref]$uri) -or $uri.Scheme -notin 'http', 'https') {
        & $report "EXPO_PUBLIC_API_URL (from $from) is not a valid http(s) URL."
        return
    }
    $h = $uri.Host
    $isLoopback = $h -in 'localhost', '10.0.2.2', '0.0.0.0', '::1', '[::1]' -or $h -match '^127\.'
    $isPrivate  = $h -match '^(10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)' -or $h -like '*.local'
    if ($isLoopback) {
        & $report "EXPO_PUBLIC_API_URL (from $from) points at a loopback/emulator address; a phone cannot reach that."
    } elseif ($uri.Scheme -eq 'http') {
        & $report "EXPO_PUBLIC_API_URL (from $from) is plain http. Android 9+ blocks cleartext traffic in this release build (no usesCleartextTraffic in the manifest); use https."
    } elseif ($isPrivate) {
        Add-Warn "EXPO_PUBLIC_API_URL (from $from) is a private-network address; the app will only work on that network."
    } else {
        Write-Ok "EXPO_PUBLIC_API_URL (from $from) is an https public host"
    }
}

function Test-OutputDir {
    if (-not $OutputDir) { return }
    Write-Step 'Output directory'
    try {
        $full = [System.IO.Path]::GetFullPath($(if ([System.IO.Path]::IsPathRooted($OutputDir)) { $OutputDir } else { Join-Path (Get-Location).Path $OutputDir }))
    } catch { Add-Err "Invalid -OutputDir: $OutputDir"; return }
    if (Test-Path -LiteralPath $full -PathType Leaf) { Add-Err "-OutputDir is a file: $full"; return }
    $script:OutputFull = $full
    Write-Ok "Verified artifacts will be copied to $full"
    if ($full.StartsWith($MobileDir, [System.StringComparison]::OrdinalIgnoreCase)) {
        $git = Get-Command git -ErrorAction SilentlyContinue
        if ($git) {
            $probe = Join-Path $full 'probe.apk'
            $r = Invoke-Capture $git.Source @('-C', $MobileDir, 'check-ignore', '-q', $probe)
            if ($r.ExitCode -ne 0) { Add-Warn 'OutputDir is inside the repo and is not gitignored; release binaries could be committed by accident (mobile/release-out/ is already ignored).' }
        }
    }
}

# ---------------------------------------------------------------------------------------------
# Build + verification
# ---------------------------------------------------------------------------------------------
$Targets = @{
    apk = @{ Task = ':app:assembleRelease'; Path = Join-Path $AndroidDir 'app\build\outputs\apk\release\app-release.apk';    Ext = 'apk' }
    aab = @{ Task = ':app:bundleRelease';   Path = Join-Path $AndroidDir 'app\build\outputs\bundle\release\app-release.aab'; Ext = 'aab' }
}

function Invoke-Gradle([string]$Task) {
    $gargs = @('--console=plain', '-I', $InitScript)
    if ($Signing.PropsFile) { $gargs += "-Daura360.signing.file=$($Signing.PropsFile)" }
    if ($HasVersionCode) { $gargs += "-Daura360.versionCode=$VersionCode" }
    if ($Architectures) { $gargs += "-PreactNativeArchitectures=$($Architectures -join ',')" }
    $gargs += $Task

    Push-Location $AndroidDir
    try {
        $script:SigningMarkers = @()
        & $GradlewBat @gargs | ForEach-Object {
            Write-Host $_
            if (([string]$_).Contains('[aura360-signing]')) { $script:SigningMarkers += [string]$_ }
        }
        return $LASTEXITCODE
    } finally { Pop-Location }
}

# Returns @{ Status; Detail; Ok } for one built artifact. Never prints secret material.
function Test-Artifact([string]$Kind, [string]$Path) {
    $problems = @()
    $names = @()
    try { $names = Get-ZipEntryNames $Path } catch { return @{ Ok = $false; Signing = 'UNREADABLE'; Detail = "not a valid archive: $($_.Exception.Message)"; Cert = $null; Embedded = $false } }

    $bundleEntry = if ($Kind -eq 'aab') { 'base/assets/index.android.bundle' } else { 'assets/index.android.bundle' }
    $embedded = $names -contains $bundleEntry
    if (-not $embedded) { $problems += "JS bundle ($bundleEntry) is NOT embedded - the app would need Metro" }
    if ($Kind -eq 'aab' -and ($names -notcontains 'BundleConfig.pb')) { $problems += 'BundleConfig.pb missing - not a valid app bundle' }
    if ($Kind -eq 'apk' -and ($names -notcontains 'AndroidManifest.xml')) { $problems += 'AndroidManifest.xml missing' }

    $dn = $null; $sha = $null; $verified = $false
    if ($Kind -eq 'apk') {
        if ($Sdk.ApkSigner) {
            $r = Invoke-Capture $Sdk.ApkSigner @('verify', '--verbose', '--print-certs', $Path)
            $verified = ($r.ExitCode -eq 0)
            if ($r.StdOut -match 'Signer #1 certificate DN:\s*(.+)')                { $dn  = $Matches[1].Trim() }
            if ($r.StdOut -match 'Signer #1 certificate SHA-256 digest:\s*([0-9a-fA-F]+)') { $sha = Normalize-Fingerprint $Matches[1] }
            if (-not $verified) { $problems += 'apksigner could not verify the APK signature' }
        }
    } else {
        $jarsigner = Find-JavaTool 'jarsigner'
        $keytool   = Find-JavaTool 'keytool'
        if ($jarsigner) {
            $r = Invoke-Capture $jarsigner @('-verify', $Path)
            $verified = ($r.StdOut -match 'jar verified')
            if (-not $verified) { $problems += 'jarsigner could not verify the AAB signature' }
        }
        if ($keytool) {
            $r = Invoke-Capture $keytool @('-printcert', '-jarfile', $Path, '-J-Duser.language=en')
            if ($r.StdOut -match '(?m)^Owner:\s*(.+)')            { $dn  = $Matches[1].Trim() }
            if ($r.StdOut -match '(?m)^\s*SHA256:\s*([0-9A-Fa-f:]+)') { $sha = Normalize-Fingerprint $Matches[1] }
        }
    }

    $label = 'NOT VERIFIED (no readable signing certificate: unsigned, or the verification tool is unavailable)'
    $signedOk = $false
    if ($dn -or $sha) {
        if ($dn -match 'CN=Android Debug') {
            $label = 'DEBUG-SIGNED - NOT production-signed, do not distribute'
            if (-not $AllowDebugSigning -or $Signing.Configured) { $problems += 'artifact is signed with the debug key' }
            else { $signedOk = $true }
        } elseif ($Signing.Configured -and $Signing.Fingerprint -and $sha -eq $Signing.Fingerprint) {
            $label = 'PRODUCTION-SIGNED (certificate matches the configured keystore)'
            $signedOk = $true
        } elseif ($Signing.Configured) {
            $label = 'SIGNED WITH A DIFFERENT KEY than the configured keystore'
            $problems += 'signing certificate does not match the configured keystore'
        } else {
            $label = 'SIGNED WITH AN UNKNOWN KEY (no production keystore configured)'
            $problems += 'cannot attribute the signing certificate to a production key'
        }
    } else {
        $problems += 'signing certificate could not be read, signature NOT verified'
    }

    $detail = if ($problems.Count -gt 0) { $problems -join '; ' } else { '' }
    $ok = ($problems.Count -eq 0) -and $signedOk -and $embedded
    @{ Ok = $ok; Signing = $label; Detail = $detail; Cert = $sha; Embedded = $embedded }
}

# ---------------------------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------------------------
Write-Host "Aura360 local Android release build" -ForegroundColor White
Write-Host "  project : $MobileDir"
Write-Host "  target  : $Target"

try {
    Test-Toolchain
    Test-AndroidSdk
    Test-ProjectFiles
    Test-Signing
    Test-ApiUrl
    Test-OutputDir

    if ($script:Errors.Count -gt 0) {
        Write-Host ""
        Write-Host "Preflight FAILED with $($script:Errors.Count) problem(s). Nothing was built." -ForegroundColor Red
        exit 2
    }
    if ($CheckOnly) {
        Write-Host ""
        Write-Host "Preflight passed ($($script:Warnings.Count) warning(s)). -CheckOnly: no build was run." -ForegroundColor Green
        exit 0
    }

    $kinds = if ($Target -eq 'all') { @('apk', 'aab') } else { @($Target) }
    $results = @()
    $buildFailed = $false

    foreach ($kind in $kinds) {
        $t = $Targets[$kind]
        Write-Step "Building $($kind.ToUpper())  ($($t.Task))"

        # Keep any previous artifact safe until the replacement is built and verified.
        $prev = "$($t.Path).previous"
        if (Test-Path -LiteralPath $t.Path) { Move-Item -LiteralPath $t.Path -Destination $prev -Force }

        $started = Get-Date
        $code = Invoke-Gradle $t.Task
        $elapsed = (Get-Date) - $started

        $res = [ordered]@{ Kind = $kind.ToUpper(); Path = $t.Path; Built = $false; Verified = $false; Signing = 'n/a'; Detail = ''; Size = 0; Copied = $null; Elapsed = $elapsed }

        if ($code -ne 0) {
            $res.Detail = "Gradle exited with code $code"
            $buildFailed = $true
        } elseif (-not (Test-Path -LiteralPath $t.Path -PathType Leaf)) {
            $res.Detail = 'Gradle reported success but the expected artifact does not exist'
            $buildFailed = $true
        } elseif ((Get-Item -LiteralPath $t.Path).Length -le 0) {
            $res.Detail = 'artifact is empty'
            $buildFailed = $true
        } else {
            $res.Built = $true
            $res.Size = (Get-Item -LiteralPath $t.Path).Length
            Write-Step "Verifying $($kind.ToUpper())"
            $v = Test-Artifact $kind $t.Path
            $res.Verified = $v.Ok
            $res.Signing = $v.Signing
            $res.Detail = $v.Detail
            if ($v.Ok) { Write-Ok "$($v.Signing)"; if ($v.Embedded) { Write-Ok 'JS bundle is embedded (no Metro needed)' } }
            else { Add-Err "$($kind.ToUpper()) verification failed: $($v.Detail)" }
        }

        if ($res.Verified) {
            if (Test-Path -LiteralPath $prev) { Remove-Item -LiteralPath $prev -Force }
            if ($script:OutputFull) {
                $null = New-Item -ItemType Directory -Force -Path $script:OutputFull
                $suffix = if ($res.Signing -like 'DEBUG-SIGNED*') { '-DEBUG-SIGNED' } else { '' }
                $dest = Join-Path $script:OutputFull ("aura360-{0}-{1}-release{2}.{3}" -f $Info.VersionName, $Info.VersionCode, $suffix, $t.Ext)
                $tmp = "$dest.partial"
                Copy-Item -LiteralPath $t.Path -Destination $tmp -Force
                Move-Item -LiteralPath $tmp -Destination $dest -Force
                $res.Copied = $dest
            }
        } else {
            # Unverified or failed: do not leave it looking like a good artifact; restore the old one.
            if (Test-Path -LiteralPath $t.Path) { Move-Item -LiteralPath $t.Path -Destination "$($t.Path).unverified" -Force }
            if (Test-Path -LiteralPath $prev)   { Move-Item -LiteralPath $prev -Destination $t.Path -Force }
        }
        $results += [pscustomobject]$res
    }

    # -----------------------------------------------------------------------------------------
    # Report
    # -----------------------------------------------------------------------------------------
    Write-Host ""
    Write-Host "================ Aura360 release build report ================" -ForegroundColor White
    Write-Host ("Package ID   : {0}" -f $Info.ApplicationId)
    Write-Host ("Version      : {0} (versionCode {1})" -f $Info.VersionName, $Info.VersionCode)
    Write-Host ("Signing cfg  : {0}" -f $(if ($Signing.Configured) { "production keystore via $($Signing.Source)" } else { 'NONE - debug key (not production)' }))
    foreach ($m in ($script:SigningMarkers | Select-Object -Unique)) { Write-Host "Gradle       : $m" }
    foreach ($r in $results) {
        Write-Host ""
        $state = if ($r.Verified) { 'OK' } elseif ($r.Built) { 'BUILT BUT NOT VERIFIED' } else { 'FAILED' }
        $color = if ($r.Verified) { 'Green' } else { 'Red' }
        Write-Host ("[{0}] {1}" -f $r.Kind, $state) -ForegroundColor $color
        if ($r.Built) {
            Write-Host ("  artifact : {0}{1}" -f $r.Path, $(if (-not $r.Verified) { '.unverified (quarantined)' } else { '' }))
            Write-Host ("  size     : {0}" -f (Format-Size $r.Size))
            Write-Host ("  signing  : {0}" -f $r.Signing)
        }
        if ($r.Copied) { Write-Host ("  copied to: {0}" -f $r.Copied) }
        if ($r.Detail) { Write-Host ("  problem  : {0}" -f $r.Detail) -ForegroundColor Red }
        Write-Host ("  time     : {0:mm\:ss}" -f $r.Elapsed)
    }
    if ($script:Warnings.Count -gt 0) {
        Write-Host ""
        Write-Host 'Warnings:' -ForegroundColor Yellow
        $script:Warnings | ForEach-Object { Write-Host "  - $_" -ForegroundColor Yellow }
    }
    Write-Host ""

    if ($buildFailed) {
        Write-Host 'RESULT: BUILD FAILED' -ForegroundColor Red
        exit 3
    }
    if (@($results | Where-Object { -not $_.Verified }).Count -gt 0) {
        Write-Host 'RESULT: BUILT BUT VERIFICATION FAILED - do not distribute' -ForegroundColor Red
        exit 4
    }
    if ($Signing.Configured) {
        Write-Host 'RESULT: SUCCESS - production-signed and verified' -ForegroundColor Green
    } else {
        Write-Host 'RESULT: SUCCESS (DEBUG-SIGNED test build only - NOT production-signed)' -ForegroundColor Yellow
    }
    exit 0
}
catch {
    Write-Host ""
    Write-Host "Unexpected error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
