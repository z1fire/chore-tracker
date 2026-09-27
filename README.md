# Chore Tracker

A personal Android app for tracking your share of household chores. Log chores as you do them, and see how your share compares with a fair split. Built from [`design.md`](design.md).

## Install on your phone

1. On your Android phone, open the [latest release](https://github.com/z1fire/chore-tracker/releases/latest) and download `chore-tracker.apk`.
2. Open the downloaded file. If Android asks, allow your browser to install unknown apps.
3. To update later, download the newer APK from Releases and install it over the old one. Your data stays.

## Where your data is stored

Everything is saved in a file (`choretrack-v1.json`) inside the app's private storage on the phone, not in browser storage. It survives restarts and updates. It is removed only if you uninstall the app, so use **Chores → Export data** for a CSV copy.

## Development

```sh
npm install
npm run dev          # browser preview (uses localStorage as a stand-in for phone storage)
npm run build && npx cap sync android   # then open android/ in Android Studio
```

Every push to `main` builds a signed APK with GitHub Actions and publishes it as a release. The signing key lives in repository secrets (`KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`). Keep the same key: an APK signed with a different key can't update the installed app.

Stack: React + TypeScript + Vite, wrapped as a native Android app with Capacitor (Filesystem for storage, Share for CSV export).
