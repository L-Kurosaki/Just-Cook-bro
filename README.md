# Just Cook Bro (Flutter Edition)

Just Cook Bro is a smart cooking assistant rebuilt with Flutter.

## 🚨 Troubleshooting Common Errors

### 1. The App shows "Configuration Failed" or Black Screen
This means the API keys were not passed to the app during the build.

**If you are using the Codemagic UI (Workflow Editor):**
1. Go to **App settings > Build > Flutter build apk**.
2. Find the **Build arguments** field.
3. Paste this **EXACT** line:
   ```text
   --dart-define=GEMINI_API_KEY=$GEMINI_API_KEY --dart-define=SUPABASE_URL=$SUPABASE_URL --dart-define=SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY --dart-define=RC_GOOGLE_KEY=$RC_GOOGLE_KEY --dart-define=API_KEY=$GEMINI_API_KEY
   ```

### 2. `Did not find xcodeproj` or Missing `ios/` folder
If you are building for iOS or macOS and see errors about missing Xcode projects, it means the platform folders weren't generated. Run this in your terminal:
```bash
flutter create .
```

---

## 🔑 Adding API Keys (Required)

### ⚠️ IMPORTANT: Where to add keys in Codemagic
**DO NOT** use "Global variables and secrets". That section is read-only for many accounts.

1.  Go to your **Application** in Codemagic.
2.  Click on the **Environment variables** tab.
3.  Add the following keys (Check "Secure" for sensitive keys):
    *   `GEMINI_API_KEY`
    *   `SUPABASE_URL`
    *   `SUPABASE_ANON_KEY` (or `SUPABASE_KEY`)
    *   `RC_GOOGLE_KEY`

### Local Development
To run locally, you must pass the keys in your run command:
```bash
flutter run \
  --dart-define=GEMINI_API_KEY=your_key \
  --dart-define=SUPABASE_URL=your_url \
  --dart-define=SUPABASE_ANON_KEY=your_key \
  --dart-define=RC_GOOGLE_KEY=your_key
```
