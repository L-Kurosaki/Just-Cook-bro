import { Recipe, UserProfile, Notification, ShopItem } from "../types";
import { supabase, isSupabaseConfigured } from "./supabaseClient";
import AsyncStorage from '@react-native-async-storage/async-storage';

const RECIPE_KEY = "jcb_recipes";
const PROFILE_KEY = "jcb_profile";
const NOTIFICATIONS_KEY = "jcb_notifications";
const SHOPPING_KEY = "jcb_shopping_list";

// --- Local Storage Helpers ---
const getLocal = async <T>(key: string): Promise<T | null> => {
  try {
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.error("Local storage read error", e);
    return null;
  }
};

const setLocal = async (key: string, data: any) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error("Local storage write error", e);
  }
};

export const storageService = {
  
  // --- RECIPES ---

  getRecipes: async (userId?: string): Promise<Recipe[]> => {
    // 1. Try Supabase
    if (isSupabaseConfigured() && userId) {
      const { data, error } = await supabase
        .from('recipes')
        .select('content')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
        
      if (!error && data) {
        return data.map((row: any) => row.content as Recipe);
      }
    }

    // 2. Fallback to Local
    return (await getLocal<Recipe[]>(RECIPE_KEY)) || [];
  },

  addRecipe: async (recipe: Recipe, userId?: string) => {
    // 1. Supabase
    if (isSupabaseConfigured() && userId) {
      await supabase
        .from('recipes')
        .insert({
          id: recipe.id,
          user_id: userId,
          title: recipe.title,
          is_public: recipe.isPublic || false,
          content: recipe
        });
    }

    // 2. Local Sync
    const current = (await getLocal<Recipe[]>(RECIPE_KEY)) || [];
    await setLocal(RECIPE_KEY, [recipe, ...current]);
  },

  updateRecipe: async (recipe: Recipe, userId?: string) => {
    // 1. Supabase
    if (isSupabaseConfigured() && userId) {
      await supabase
        .from('recipes')
        .update({
          title: recipe.title,
          is_public: recipe.isPublic || false,
          content: recipe
        })
        .eq('id', recipe.id)
        .eq('user_id', userId);
    }

    // 2. Local Sync
    const current = (await getLocal<Recipe[]>(RECIPE_KEY)) || [];
    const updated = current.map(r => r.id === recipe.id ? recipe : r);
    await setLocal(RECIPE_KEY, updated);
  },

  deleteRecipe: async (recipeId: string, userId?: string) => {
    // 1. Supabase
    if (isSupabaseConfigured() && userId) {
      await supabase
        .from('recipes')
        .delete()
        .eq('id', recipeId)
        .eq('user_id', userId);
    }

    // 2. Local Sync
    const current = (await getLocal<Recipe[]>(RECIPE_KEY)) || [];
    const updated = current.filter(r => r.id !== recipeId);
    await setLocal(RECIPE_KEY, updated);
  },

  // --- PUBLIC / COMMUNITY ---

  getPublicRecipes: async (): Promise<Recipe[]> => {
    if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from('recipes')
          .select('content')
          .eq('is_public', true) 
          .limit(50);
          
        if (!error && data) {
            return data.map((row: any) => row.content as Recipe);
        }
    }

    // Fallback Mock Data
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
            reviews: [],
            saves: 124,
            cooks: 45
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
            reviews: [],
            saves: 89,
            cooks: 12
        }
    ];
  },

  saveCommunityRecipe: async (recipe: Recipe, myUserId?: string) => {
     return { 
         ...recipe, 
         id: crypto.randomUUID(), 
         isPublic: false, 
         sourceUrl: `Community: ${recipe.author}`,
         originalAuthor: recipe.originalAuthor || recipe.author,
         originalSource: 'Just Cook Bro Community'
     };
  },

  // --- PROFILES ---

  saveProfile: async (profile: UserProfile, userId?: string) => {
    await setLocal(PROFILE_KEY, profile);
    
    if (isSupabaseConfigured() && userId) {
        await supabase.from('profiles').upsert({
            id: userId,
            is_premium: profile.isPremium,
            dietary_preferences: profile.dietaryPreferences,
            allergies: profile.allergies,
            is_delete_locked: profile.isDeleteLocked,
            music_history: profile.musicHistory,
            custom_collections: profile.customCollections
        });
    }
  },

  getProfile: async (userId?: string): Promise<UserProfile | null> => {
    if (isSupabaseConfigured() && userId) {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
            
        if (!error && data) {
            return {
                name: data.email || "Chef",
                email: data.email,
                isPremium: data.is_premium,
                dietaryPreferences: data.dietary_preferences || [],
                allergies: data.allergies || [],
                isDeleteLocked: data.is_delete_locked || false,
                musicHistory: data.music_history || [],
                customCollections: data.custom_collections || []
            };
        }
    }

    return await getLocal<UserProfile>(PROFILE_KEY);
  },

  getNotifications: async (): Promise<Notification[]> => {
    return (await getLocal<Notification[]>(NOTIFICATIONS_KEY)) || [];
  },

  // --- SHOPPING LIST ---

  getShoppingList: async (): Promise<ShopItem[]> => {
     return (await getLocal<ShopItem[]>(SHOPPING_KEY)) || [];
  },

  saveShoppingList: async (items: ShopItem[]) => {
     await setLocal(SHOPPING_KEY, items);
  }
};