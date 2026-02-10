# Just Cook Bro

Just Cook Bro is an advanced cooking assistant developed with React Native and Expo. It leverages Artificial Intelligence to organize the culinary workflow, providing users with tools to scan ingredients, generate recipes, and manage their cooking process efficiently.

## Core Functionality

### 1. Artificial Intelligence Integration
The application utilizes the Google Gemini API to power its core features:
*   **Visual Recognition:** Users can capture images of ingredients or finished dishes. The AI analyzes these images to suggest relevant recipes.
*   **URL Extraction:** The system parses recipe content from external URLs (such as YouTube videos or food blogs), extracting structured data like ingredients and steps while removing extraneous content like advertisements.
*   **Contextual Assistance:** During the cooking process, users can query the AI for clarifications on techniques or terminology specific to the active step.

### 2. Cooking Mode
The Cooking Mode is designed for hands-free or minimal-interaction use in a kitchen environment:
*   **Interface:** Features high-contrast, large typography for readability from a distance.
*   **Timer System:** Timers are automatically detected within instructions and can be activated with a single tap.
*   **Media Integration:** Users can link their Spotify account to control audio playback directly within the app.

### 3. Data Management and Offline Support
*   **Local Storage:** Recipes are cached locally on the device, ensuring functionality even without an internet connection.
*   **Cloud Sync:** When a Supabase connection is configured, user profiles and recipes are synchronized across devices.
*   **Shopping Lists:** Users can generate checklists directly from recipe ingredients.

### 4. Community Features
*   **Public Feed:** A platform for users to share their culinary creations.
*   **Review System:** Users can submit ratings and text-based reviews for shared recipes.

## Technical Requirements

*   **Runtime:** Node.js (Version 18 or newer)
*   **Framework:** Expo SDK 52
*   **Language:** TypeScript
*   **AI Provider:** Google Gemini SDK (`@google/genai`)
*   **Database:** Supabase (Optional for local-only mode)

## Installation Guide

### Step 1: Install Dependencies
Run the following command in your project root to install the required packages:

```bash
yarn install
```

### Step 2: Configuration
Create a `.env` file or configure your Expo Secrets with the following keys. These are critical for the application to function.

*   `EXPO_PUBLIC_API_KEY`: Your Google Gemini API Key.
*   `EXPO_PUBLIC_SUPABASE_URL`: Your Supabase Project URL.
*   `EXPO_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase Anonymous Key.
*   `EXPO_PUBLIC_SPOTIFY_CLIENT_ID`: Your Spotify Developer Client ID.

### Step 3: Run the Application
To start the development server:

```bash
npx expo start
```

### Step 4: Build for Android
To generate an installable APK file for Android devices:

```bash
eas build -p android --profile preview
```


## License

This software is distributed under the MIT License.
