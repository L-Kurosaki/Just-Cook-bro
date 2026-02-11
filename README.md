# Just Cook Bro (Flutter Edition)

Just Cook Bro is a smart cooking assistant rebuilt with Flutter.

## 🚨 Troubleshooting Common Errors

### 1. The App shows "Setup Required" or "Configuration Failed"
This means Codemagic has the keys in settings, but hasn't injected them into the app.

**FIX:**
1. Open Codemagic.
2. Go to **App settings > Build > Android**.
3. Find the **Build arguments** input box.
4. Paste this **EXACT** line:
   ```text
   --dart-define=GEMINI_API_KEY=$GEMINI_API_KEY --dart-define=SUPABASE_URL=$SUPABASE_URL --dart-define=SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY --dart-define=RC_GOOGLE_KEY=$RC_GOOGLE_KEY
   ```
5. Click **Save** and **Rebuild**.

### 2. Check Variable Names
Ensure your Environment Variables in Codemagic are named EXACTLY like this (case sensitive):
*   `GEMINI_API_KEY` (Value: AIza...)
*   `SUPABASE_URL` (Value: https://...)
*   `SUPABASE_ANON_KEY` (Value: eyJ...)
*   `RC_GOOGLE_KEY` (Value: test_Bek...)

---

## 🔑 Adding API Keys (Local Run)

To run locally on your computer:
```bash
flutter run \
  --dart-define=GEMINI_API_KEY=your_key \
  --dart-define=SUPABASE_URL=your_url \
  --dart-define=SUPABASE_ANON_KEY=your_key \
  --dart-define=RC_GOOGLE_KEY=your_key
```
