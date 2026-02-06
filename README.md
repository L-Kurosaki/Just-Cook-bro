# Just Cook Bro 🍳

**Just Cook Bro** is a smart, AI-powered cooking assistant built with React Native and Expo. It transforms the chaotic experience of finding and following recipes into a streamlined, organized, and enjoyable process.

## 🌟 Key Features

*   **AI Chef (Gemini Powered):**
    *   **Photo Scan:** Snap a picture of ingredients or a finished dish, and the AI generates a recipe.
    *   **Smart Link:** Paste a URL from YouTube, TikTok, or a blog, and the AI extracts the structured recipe, removing clutter and ads.
    *   **Cooking Help:** Ask the AI specific questions about a step while cooking.
*   **Interactive Cooking Mode:**
    *   Step-by-step navigation with large text.
    *   Built-in timers that alert you when time is up.
    *   Spotify integration to log your "Cooking Jams".
*   **Community Feed:**
    *   Share your best recipes with the world.
    *   Rate and review recipes from other users.
*   **Personalization:**
    *   **Dietary Profiles:** Set Vegan, Keto, etc.
    *   **Allergy Safety:** Automatic warnings if a recipe contains your allergens.
*   **Organization:**
    *   Save to Cookbook.
    *   Shopping List generator.
    *   Offline support for saved recipes.

## 🛠 Tech Stack

*   **Framework:** React Native (Expo SDK 50+)
*   **Language:** TypeScript
*   **Styling:** NativeWind (Tailwind CSS)
*   **AI Engine:** Google Gemini (`gemini-3-flash-preview`, `gemini-pro-vision`)
*   **Backend & Auth:** Supabase (PostgreSQL)
*   **State Management:** React Hooks + Async Storage (for offline cache)
*   **Navigation:** React Navigation (Stack + Bottom Tabs)

## 🚀 Getting Started

### Prerequisites

*   Node.js (v18+)
*   Expo Go app on your phone OR Android Studio/Xcode for simulators.

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/yourusername/just-cook-bro.git
    cd just-cook-bro
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Environment Setup:**
    Create a `.env` file (or ensure keys are set in `services/supabaseClient.ts` and `services/geminiService.ts`):
    *   `API_KEY`: Your Google Gemini API Key.
    *   Supabase URL & Anon Key.

4.  **Run the app:**
    ```bash
    npx expo start
    ```

## 🗄️ Database Schema (Supabase)

This app requires specific tables in Supabase to function. Run the following in your Supabase **SQL Editor**:

### 1. Profiles Table
Stores user preferences, premium status, and allergies.
```sql
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  is_premium boolean default false,
  dietary_preferences text[],
  allergies text[],
  music_history jsonb, 
  custom_collections text[],
  updated_at timestamp with time zone default timezone('utc'::text, now())
);
```

### 2. Recipes Table
Stores both private (cookbook) and public community recipes.
```sql
create table public.recipes (
  id text primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text,
  is_public boolean default false,
  content jsonb, 
  created_at timestamp with time zone default timezone('utc'::text, now())
);
```

### 3. Reviews Table
Stores community ratings and comments.
```sql
create table public.reviews (
  id uuid default gen_random_uuid() primary key,
  recipe_id text not null references public.recipes(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  user_name text,
  rating int check (rating >= 1 and rating <= 5),
  comment text,
  created_at timestamp with time zone default now()
);
```

### 4. Enable Security (RLS)
Don't forget to enable Row Level Security policies (see `sql_setup.sql` if available) to ensure users can only edit their own data.

## 📱 Folder Structure

*   `App.tsx`: Main entry point and Navigation setup.
*   `components/`: UI Screens and reusable widgets.
    *   `CookingMode.tsx`: The core step-by-step experience.
    *   `RecipeDetailScreen.tsx`: View ingredients, reviews, and stores.
*   `services/`: External API logic.
    *   `geminiService.ts`: AI prompt engineering.
    *   `supabaseClient.ts`: Database connection.
    *   `storageService.ts`: Data abstraction layer (handles Offline vs. Cloud).
*   `types.ts`: TypeScript interfaces for robust typing.

## 📄 License

This project is licensed under the MIT License.
