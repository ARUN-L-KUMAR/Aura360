# Local release build (quick reference)

Run from `apps/mobile`:

```powershell
npx expo prebuild --platform android --no-install
.\scripts\build-release.ps1 -Target apk -VersionCode 6 -OutputDir release-out
```

See `scripts/README.md` for all options and exit codes.
