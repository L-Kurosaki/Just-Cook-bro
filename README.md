# Just Cook Bro (Flutter Edition)

Just Cook Bro is a smart cooking assistant rebuilt with Flutter.

## 🚨 Troubleshooting Common Errors

### 1. `Did not find xcodeproj` or Missing `ios/` folder
If you are building for iOS or macOS and see errors about missing Xcode projects, it means the platform folders weren't generated. Run this in your terminal:
```bash
flutter create .
```
This regenerates the `ios`, `android`, `web`, `macos`, etc. folders.

### 2. GitHub Actions: `403 Forbidden` / `Write access not granted`
If your deploy fails with a permission error, it's fixed in the latest code, but ensure:
1. Go to **Settings > Actions > General**.
2. Scroll to **Workflow permissions**.
3. Select **Read and write permissions**.
4. Click **Save**.

### 3. `Couldn't find the placeholder for base href`
Make sure you have committed the file `web/index.html` with the `<base href="$FLUTTER_BASE_HREF">` tag.

---

## 🔑 Adding API Keys (Required)

Your app needs API keys to work.

### GitHub Actions (Secrets)
Go to **Settings > Secrets and variables > Actions** and add:

| Name | Description |
|------|-------------|
| `GEMINI_API_KEY` | Gemini AI Key |
| `SUPABASE_URL` | Supabase Project URL |
| `SUPABASE_ANON_KEY` | Supabase Anon Key |
| `RC_GOOGLE_KEY` | RevenueCat Android Key |
| `RC_APPLE_KEY` | RevenueCat iOS Key |

### Codemagic (Environment Variables)
Add these variable names and your values in the Codemagic Workflow Editor.

### Local Development
```bash
flutter run \
  --dart-define=API_KEY=your_key \
  --dart-define=SUPABASE_URL=your_url \
  --dart-define=SUPABASE_ANON_KEY=your_key \
  --dart-define=RC_GOOGLE_KEY=your_key
```
