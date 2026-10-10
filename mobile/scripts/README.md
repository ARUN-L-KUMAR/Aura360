# Local Android release builds (no EAS Build)

`build-release.ps1` runs the project's own Gradle wrapper (`android/gradlew.bat`) to produce a signed
**APK** (install on a phone) and/or **AAB** (upload to Google Play), verifies the result, and prints a report.

```powershell
cd C:\Users\arunk\Projects\Aura360\mobile        # or run it from the repo root as .\mobile\scripts\build-release.ps1

.\scripts\build-release.ps1 -CheckOnly           # preflight only, builds nothing
.\scripts\build-release.ps1 -Target apk          # signed APK
.\scripts\build-release.ps1 -Target aab          # signed AAB for Play
.\scripts\build-release.ps1 -Target all          # both, sequentially (default)
```

Useful options: `-VersionCode 2` (Play needs a higher versionCode per upload), `-Architectures arm64-v8a`
(much faster APK for a personal phone), `-OutputDir C:\Releases\aura360` (copies *verified* artifacts only),
`-AllowDebugSigning` (local test build, labelled DEBUG-SIGNED). If script execution is blocked:
`powershell -ExecutionPolicy Bypass -File .\scripts\build-release.ps1 -Target apk`.

| Exit code | Meaning |
|---|---|
| 0 | Built and verified |
| 2 | Preflight failed (nothing was built) |
| 3 | Gradle build failed or artifact missing/empty |
| 4 | Built, but signature/bundle verification failed |

Artifacts (verified against the generated Gradle config: no flavours, no ABI splits):

- `android/app/build/outputs/apk/release/app-release.apk`
- `android/app/build/outputs/bundle/release/app-release.aab`

## Prerequisites

| Need | Version | Notes |
|---|---|---|
| JDK | 17 or newer | Gradle 9.3.1 + AGP 8.12. `JAVA_HOME` or `java` on PATH. |
| Android SDK | platform `android-36`, build-tools `36.0.0`, NDK `27.1.12297006` | `ANDROID_HOME` (or `sdk.dir` in `android/local.properties`). Versions come from `node_modules/react-native/gradle/libs.versions.toml`. Accept licences once: `sdkmanager --licenses`. |
| Node / npm | current LTS+ | `npm install` already run in `mobile/`. |
| Network | first build only | Downloads Gradle 9.3.1 and Maven dependencies; the first native build is slow (4 ABIs). |

The script never installs anything, never runs `expo prebuild`, and never touches `android/` files.

## Signing

Three different things, easy to confuse:

- **Debug signing** - the throwaway `android/app/debug.keystore`. The generated project signs *release* builds with it
  by default. Installable, but not acceptable to Play and not a stable identity. The script labels such output
  `DEBUG-SIGNED` and refuses to build without `-AllowDebugSigning`.
- **Release / upload signing** - a key you own. You sign the AAB (and APKs you hand out) with it.
- **Google Play App Signing** - Google holds the final app-signing key and re-signs what you upload; your key is
  only an *upload key* that proves the upload is yours. (Directly installed APKs carry your key, not Google's, so a
  Play-installed copy and a sideloaded APK cannot update each other.)

### One-time setup

1. **Decide whether a signing identity already exists.** If Aura360 builds were ever made with EAS (`eas.json` has
   `development`/`preview`/`production` profiles), EAS may hold an Android keystore. Run `npx eas-cli credentials`
   (interactive, read-only if you just browse) to see. Phones that have an EAS-signed build installed can only be
   *updated* by an APK signed with that same key; otherwise uninstall first. Nothing here creates or rotates keys.
2. **Only if no key exists**, generate an upload keystore yourself, outside the repo (it prompts for the passwords;
   nothing secret ends up on the command line):

   ```powershell
   $dir = "$env:USERPROFILE\.aura360-signing"; New-Item -ItemType Directory -Force $dir | Out-Null
   keytool -genkeypair -v -storetype PKCS12 -keystore "$dir\aura360-upload.jks" `
           -alias aura360-upload -keyalg RSA -keysize 2048 -validity 10000
   ```

   Back the file and passwords up (password manager + offline copy). Losing an upload key means a Play support request.
3. **Point the build at it** - copy `keystore.properties.example` to `keystore.properties` (gitignored) and fill it
   in, *or* set `AURA360_UPLOAD_STORE_FILE`, `AURA360_UPLOAD_STORE_PASSWORD`, `AURA360_UPLOAD_KEY_ALIAS`,
   `AURA360_UPLOAD_KEY_PASSWORD` (environment wins). Use forward slashes in paths.
4. `.\scripts\build-release.ps1 -CheckOnly` should now print `Production signing configured`.

### How signing is applied and verified

`release-signing.init.gradle` is passed to Gradle with `-I`; it creates a `release` signing config from the values
above and attaches it to the release build type, so the generated (gitignored, regenerable) `android/app/build.gradle`
stays untouched and survives a future `expo prebuild`. Passwords are read inside Gradle and never printed or passed on
a command line. Partial or invalid credentials fail the build instead of falling back to debug signing.

After the build the script does **not** trust "Gradle succeeded": it checks `apksigner verify` (APK) or
`jarsigner -verify` + the certificate (AAB), compares the signing certificate's SHA-256 with the configured keystore,
and checks the JS bundle is embedded. Only an exact match is reported `PRODUCTION-SIGNED`. A failed check quarantines
the artifact as `*.unverified` and restores the previous one.

## Runtime API URL (read this before shipping)

The app picks its server in `src/lib/config.ts`: `EXPO_PUBLIC_API_URL`, else the Metro host (dev only), else the
emulator loopback `http://10.0.2.2:3000`. A release build has no Metro host, so **without `EXPO_PUBLIC_API_URL` the
release app points at the emulator loopback** until the user types a server on the sign-in screen. Release builds
also block cleartext `http://` on Android 9+. Set an `https://` URL at build time, e.g.

```powershell
$env:EXPO_PUBLIC_API_URL = 'https://<your-api-host>'   # or EXPO_PUBLIC_API_URL=... in mobile\.env.production (git-ignored by the root .env* rule)
.\scripts\build-release.ps1 -Target apk
```

The preflight warns when it is unset and fails when it is loopback or plain `http://` (`-SkipApiUrlCheck` to override).
Note that `EXPO_PUBLIC_*` values are embedded in the shipped bundle - never put secrets in them.

## Installing the APK

```powershell
# USB debugging on, phone connected
adb devices
adb install -r android\app\build\outputs\apk\release\app-release.apk
```

Or copy the file to the phone, open it from Files, and allow "install unknown apps" for that app when asked.
`-r` keeps data when updating an app signed with the same key; if Android reports a signature conflict, the installed
copy was signed with a different key (see *Signing > one-time setup > 1*).

## Uploading the AAB to Google Play

1. Build with production signing and a fresh `-VersionCode` (higher than anything already uploaded).
2. Play Console > your app > **Testing > Internal testing** (recommended first) or **Production** > **Create new release**.
3. First release only: accept **Play App Signing** when prompted; upload `app-release.aab`.
4. Complete release notes, store listing, data-safety, content-rating and target-audience forms; roll out.

## Not covered / by design

- No `expo prebuild`: the native project is generated once and treated as the source of truth. If `app.json`
  (plugins, icons, package, version) changes, regenerate deliberately with `npx expo prebuild --platform android`
  (never `--clean` unless you mean it). Because `android/` is untracked, **copy it somewhere first** so you can
  diff afterwards. The preflight flags `applicationId`/version drift.
- `eas.json` `appVersionSource: remote` only affects EAS builds; local builds use the generated `versionCode`
  (currently `1`) unless you pass `-VersionCode`.
- The generated `android/` folder is gitignored (`/android` in `mobile/.gitignore`), so it is not versioned.
