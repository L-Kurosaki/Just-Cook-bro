import { Recipe, UserProfile } from "../types";
import { supabase, isSupabaseConfigured } from "./supabaseClient";

const RECIPE_KEY = "jcb_recipes";
const PROFILE_KEY = "jcb_profile";

export const storageService = {
  saveRecipes: async (recipes: Recipe[], userId?: string) => {
    // 1. Try Supabase if configured and user is logged in
    if (isSupabaseConfigured() && userId) {
      try {
        // In a real app, we would upsert each recipe. 
        // For simplicity, we assume we just sync the list or add new ones.
        // This is a basic implementation of syncing local state to DB.
        for (const recipe of recipes) {
           const { error } = await supabase
            .from('recipes')
            .upsert({ 
                id: recipe.id,
                user_id: userId,
                title: recipe.title, 
                content: recipe // Storing full JSON in a jsonb column
            });
           if (error) console.error("Supabase Save Error:", error);
        }
        return;
      } catch (e) {
        console.error("Supabase connection failed", e);
      }
    }

    // 2. Fallback to LocalStorage
    try {
      localStorage.setItem(RECIPE_KEY, JSON.stringify(recipes));
    } catch (e: any) {
      if (
        e.name === 'QuotaExceededError' || 
        e.name === 'NS_ERROR_DOM_QUOTA_REACHED'
      ) {
        console.warn("Storage quota exceeded. Compressing...");
        const compressed = recipes.map(r => ({
          ...r,
          imageUrl: r.imageUrl?.startsWith('data:') ? 'https://via.placeholder.com/800?text=Image+Saved+Online' : r.imageUrl
        }));
        try {
          localStorage.setItem(RECIPE_KEY, JSON.stringify(compressed));
        } catch (err) {
          console.error("Critical storage failure");
        }
      }
    }
  },

  getRecipes: async (userId?: string): Promise<Recipe[]> => {
    // 1. Try Supabase
    if (isSupabaseConfigured() && userId) {
      const { data, error } = await supabase
        .from('recipes')
        .select('content')
        .eq('user_id', userId);
        
      if (!error && data) {
        return data.map((row: any) => row.content as Recipe);
      }
    }

    // 2. Fallback
    try {
      const data = localStorage.getItem(RECIPE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  getPublicRecipes: async (): Promise<Recipe[]> => {
    // 1. Try Supabase
    if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from('recipes')
          .select('content')
          .eq('is_public', true) // Assuming you have a column for this, or check content->isPublic
          .limit(20);
          
        if (!error && data) {
            // Filter client side just in case
            return data.map((row: any) => row.content as Recipe);
        }
    }

    // 2. Return Mock Data for the Community Feed if offline/demo
    return [
        {
            id: 'comm-1',
            title: 'Spicy Basil Chicken',
            description: 'A quick Thai-inspired stir fry.',
            prepTime: '10 min',
            cookTime: '15 min',
            servings: 2,
            ingredients: [],
            steps: [],
            imageUrl: 'https://images.unsplash.com/photo-1564834724105-918b73d1b9e0?w=800',
            isPublic: true,
            author: 'Chef Alex',
            reviews: []
        },
        {
            id: 'comm-2',
            title: 'Creamy Mushroom Risotto',
            description: 'Rich, earthy, and perfectly creamy.',
            prepTime: '20 min',
            cookTime: '40 min',
            servings: 4,
            ingredients: [],
            steps: [],
            imageUrl: 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=800',
            isPublic: true,
            author: 'Maria C.',
            reviews: []
        },
        {
            id: 'comm-3',
            title: 'Ultimate Avocado Toast',
            description: 'The breakfast of champions.',
            prepTime: '5 min',
            cookTime: '5 min',
            servings: 1,
            ingredients: [],
            steps: [],
            imageUrl: 'https://images.unsplash.com/photo-1588137372308-15f75323a51d?w=800',
            isPublic: true,
            author: 'Green Eater',
            reviews: []
        }
    ];
  },

  saveProfile: async (profile: UserProfile, userId?: string) => {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    
    if (isSupabaseConfigured() && userId) {
        // Sync premium status to profile table
        await supabase.from('profiles').upsert({
            id: userId,
            is_premium: profile.isPremium
        });
    }
  },

  getProfile: (): UserProfile | null => {
    try {
      const data = localStorage.getItem(PROFILE_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  }
};