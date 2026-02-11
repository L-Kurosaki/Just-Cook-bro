# Just Cook Bro (Flutter Edition)

Just Cook Bro is a smart cooking assistant rebuilt with Flutter.

## 🚀 How to Build & Download APK (Free Solution)

We have configured **GitHub Actions** to fulfill your requirement for a free hosting and building solution.

1. **Push your code** to a GitHub repository.
2. Go to the **Actions** tab in your GitHub repository.
3. Click on the latest **"Android Build"** workflow run.
4. Scroll down to the **Artifacts** section and click **JustCookBro-APK**.
5. Extract the zip file and drag the APK onto your emulator.

**Note:** The app has backup API keys built-in. It will connect to APIs and run smoothly immediately, even without configuring server secrets.

---

## 🔑 Custom Keys (Optional)

If you want to use your own specific API keys in the future (overriding the backups), go to **Settings > Secrets and variables > Actions** in your GitHub repository and add:
- `GEMINI_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `RC_GOOGLE_KEY`
