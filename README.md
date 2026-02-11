# Just Cook Bro (Flutter Edition)

Just Cook Bro is a smart cooking assistant rebuilt with Flutter. It organizes the culinary workflow using AI to scan ingredients, generate recipes, and guide users through cooking with timers and music.

## Features

*   **AI Chef**: Powered by Google Gemini.
    *   **Recipe Generation**: Create recipes from text prompts.
    *   **Visual Recognition**: Scan ingredients to get recipe suggestions.
    *   **Cooking Helper**: Ask AI for tips during specific cooking steps.
    *   **Store Finder**: Locate ingredients nearby (Google Maps Grounding).
*   **Cooking Mode**: Large text, interactive timers, and Spotify integration.
*   **Cloud Sync**: User profiles and public feed powered by Supabase.
*   **Offline First**: Recipes are cached locally.

## Project Structure

```
lib/
├── main.dart             # Entry point
├── models.dart           # Data models (Recipe, User, etc.)
├── screens/              # UI Screens
│   ├── home_screen.dart
│   ├── cooking_mode_screen.dart
│   ├── recipe_detail_screen.dart
│   ├── ...
├── services/             # Logic & API
│   ├── gemini_service.dart
│   ├── supabase_service.dart
│   ├── spotify_service.dart
│   ├── ...
└── widgets/              # Reusable UI components
```

## Setup & Run

### Prerequisites
*   Flutter SDK (>=3.2.0)
*   Supabase Project (for Auth & Cloud DB)

### Installation
1.  **Get Dependencies**:
    ```bash
    flutter pub get
    ```

2.  **Configuration**:
    Pass API keys via `--dart-define` or configure them in your environment.
    *   `API_KEY`: Google Gemini API Key.
    *   `OPENAI_API_KEY`: (Optional) Fallback AI key.
    *   `SUPABASE_URL`: Your Supabase URL.
    *   `SUPABASE_ANON_KEY`: Your Supabase Key.

3.  **Run**:
    ```bash
    flutter run --dart-define=API_KEY=your_key_here
    ```

## Dependencies
See `pubspec.yaml` for the full list of packages, including `google_generative_ai`, `supabase_flutter`, `provider`, and `lucide_icons`.
