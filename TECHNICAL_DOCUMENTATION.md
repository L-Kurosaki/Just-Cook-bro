# Technical Documentation

## 1. Technology Stack

*   **Frontend:** Flutter (Dart)
    *   Targeting Android, iOS, and Web.
    *   State management via `setState` and Service Locator pattern.
*   **AI Engine:** Google Gemini (`gemini-3-flash-preview`)
    *   **Text-to-Recipe:** Generates structured JSON recipes from natural language prompts.
    *   **Vision-to-Recipe:** Analyzes images to validate food content and suggest recipes.
*   **Backend:** Supabase
    *   **Auth:** Email/Password authentication via GoTrue.
    *   **Database:** PostgreSQL for storing community recipes (`public.recipes` table).
    *   **Storage:** S3-compatible buckets for user avatars.
*   **Monetization:** RevenueCat
    *   Manages "Pro" entitlements and subscription status across platforms.
*   **Local Storage:** `shared_preferences`
    *   Used for offline caching of private recipes and folders.

## 2. Architecture

The app follows a clean **Service-Oriented Architecture**:

```
lib/
├── models.dart          # Data Definitions (Recipe, UserProfile)
├── main.dart            # Entry Point & Env Config
├── screens/             # UI Layer (Home, CookingMode, etc.)
├── services/            # Logic Layer (Singletons)
│   ├── gemini_service.dart      # AI Prompts & Validation
│   ├── supabase_service.dart    # Cloud Sync & Auth
│   ├── storage_service.dart     # Local Persistence
│   └── revenue_cat_service.dart # Subscription Logic
└── widgets/             # Reusable UI Components
```

### Data Flow
1.  **Input:** User provides text or image.
2.  **Processing:** `GeminiService` constructs a prompt with strict JSON schema and user dietary constraints (`UserProfile`).
3.  **Validation:** AI output is parsed and validated against the `Recipe` model.
4.  **Storage:** Result is saved locally via `StorageService` (JSON in SharedPreferences).
5.  **Sync:** If shared, the recipe is uploaded to Supabase via `SupabaseService`.

## 3. RevenueCat Implementation

We use RevenueCat to handle the complexity of In-App Purchases (IAP).

**Key Components:**
*   **Configuration:** API keys are injected at build time.
*   **Entitlement Check:** `RevenueCatService.isPremium()` checks for the `pro` entitlement.
*   **Paywall:** We use `RevenueCatUI.presentPaywallIfNeeded('pro')` to show a native, pre-built paywall UI when a user hits a limit (e.g., adding the 11th recipe).
*   **Synchronization:** Upon successful purchase, the app updates the local state and syncs the `is_premium` flag to Supabase.

## 4. AI & Safety Features

Safety is paramount when dealing with food allergies.

**Prompt Engineering:**
Every prompt to Gemini includes a "Critical Warning" block if the user has allergies defined in their profile.
```dart
prompt += " CRITICAL WARNING: The user is ALLERGIC to: ${profile.allergies}. Do NOT include these ingredients.";
```

**Vision Pipeline:**
1.  Image bytes are sent to `gemini-3-flash-preview`.
2.  System asks: "Is this food? YES/NO".
3.  If YES, it generates recipe options.
4.  If NO, the operation is rejected to maintain quality.

## 5. Environment Variables
To keep secrets secure, API keys are passed during the build process:
```bash
flutter build apk --dart-define=GEMINI_API_KEY="xyz" --dart-define=SUPABASE_URL="xyz" ...
```
The app includes a fallback mechanism (`_getEnv`) to support both standard naming and CI/CD specific variable names.