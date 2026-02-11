# Just Cook Bro (Flutter Edition)

Just Cook Bro is a smart cooking assistant rebuilt with Flutter.

## 💸 Free Hosting Guide

If GitHub is asking for money, your repository is likely **Private**. Use **Netlify** instead (it is free for private projects).

### Option 1: The Easiest Way (Netlify Drag & Drop)
**Best for:** Quick testing without complex setup.

1.  **Build the app locally**:
    Open your terminal in the project folder and run:
    ```bash
    flutter build web --release --dart-define=API_KEY=your_gemini_key
    ```
    *(Replace `your_gemini_key` with your actual key)*

2.  **Locate the folder**:
    Go to your project folder -> `build/` -> `web/`.
    *(This `web` folder contains your full website)*

3.  **Upload**:
    *   Go to [app.netlify.com/drop](https://app.netlify.com/drop).
    *   Drag and drop the `web` folder onto the page.
    *   **Done!** Your app is online for free.

---

### Option 2: Mobile Build (Codemagic)
**Best for:** Creating the Android App file (.apk).

1.  Sign up at [Codemagic.io](https://codemagic.io) (Free Tier includes 500 build minutes/month).
2.  Connect your GitHub repository.
3.  Codemagic will detect `codemagic.yaml`.
4.  Add your `API_KEY` in the Environment Variables section.
5.  Click **Start Build** to get your Android APK file.

---

## 🛠 Setup Locally (For Development)

1.  **Initialize**:
    ```bash
    flutter create . --platforms=android,ios,web
    flutter pub get
    ```

2.  **Run**:
    ```bash
    flutter run --dart-define=API_KEY=your_key
    ```
