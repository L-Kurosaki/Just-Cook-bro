# Just Cook Bro (Flutter Edition) v1.0.1

Just Cook Bro is a smart cooking assistant rebuilt with Flutter.

## 🚀 How to Download Your App (APK)

The Android app is built automatically by GitHub Actions. You can download the APK file from the **Artifacts** section of the build page.

### 📍 Where to find it
**[Click here to go to the Build Page](https://github.com/L-Kurosaki/Just-Cook-bro/actions/runs/21968217256)**

### 📝 Step-by-Step Instructions
1. Click the link above to open the GitHub Actions run.
2. **Scroll down** to the very bottom of that page.
3. Look for the section titled **Artifacts**.
4. Click on **JustCookBro-APK**. This will download a `.zip` file.
5. **Unzip** the file to find `app-release.apk`.

### 📱 How to Install
*   **On Emulator:** Simply drag and drop `app-release.apk` onto your open Android Emulator window.
*   **On Phone:** Send the file to your phone and tap it to install. (Ensure "Install from Unknown Sources" is enabled in settings).

This APK has backup API keys pre-configured, so it will work immediately.

---

## 🔑 Custom Keys (Optional)

If you want to use your own specific API keys in the future (overriding the backups), go to **Settings > Secrets and variables > Actions** in your GitHub repository and add:
- `GEMINI_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `RC_GOOGLE_KEY`
