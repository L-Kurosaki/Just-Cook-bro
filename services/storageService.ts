import { Recipe, UserProfile, Notification } from "../types";
import { supabase, isSupabaseConfigured } from "./supabaseClient";

const RECIPE_KEY = "jcb_recipes";
const PROFILE_KEY = "jcb_profile";
const NOTIFICATIONS_KEY = "jcb_notifications";

export const storageService = {
  saveRecipes: async (recipes: Recipe[], userId?: string) => {
    // 1. Try Supabase if configured and user is logged in
    if (isSupabaseConfigured() && userId) {
      try {
        for (const recipe of recipes) {
           const { error } = await supabase
            .from('recipes')
            .upsert({ 
                id: recipe.id,
                user_id: userId,
                title: recipe.title, 
                content: recipe 
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
          .eq('is_public', true) 
          .limit(20);
          
        if (!error && data) {
            return data.map((row: any) => row.content as Recipe);
        }
    }

    // 2. Return Mock Data with Social Stats
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
            reviews: [],
            saves: 230,
            cooks: 150
        }
    ];
  },

  // --- Social / Notifications ---

  getNotifications: async (): Promise<Notification[]> => {
    // In a real app, fetch from Supabase 'notifications' table.
    // Here we return mock data + localStorage data
    try {
        const local = localStorage.getItem(NOTIFICATIONS_KEY);
        const parsed: Notification[] = local ? JSON.parse(local) : [];
        
        // Combine with some fake "incoming" notifications for demo purposes
        const demoNotifs: Notification[] = [
            {
                id: 'n-1',
                type: 'save',
                message: 'Chef Alex saved your "Grandma\'s Pie" recipe!',
                date: new Date(Date.now() - 10000000).toISOString(),
                read: false,
                actorName: 'Chef Alex'
            },
            {
                id: 'n-2',
                type: 'cook',
                message: 'Maria C. just cooked your "Spicy Pasta".',
                date: new Date(Date.now() - 50000000).toISOString(),
                read: true,
                actorName: 'Maria C.'
            }
        ];
        
        // Merge and dedupe
        const combined = [...parsed, ...demoNotifs].filter((v,i,a)=>a.findIndex(t=>(t.id === v.id))===i);
        return combined.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (e) {
        return [];
    }
  },

  // Called when YOU save someone else's recipe
  saveCommunityRecipe: async (recipe: Recipe, myUserId?: string) => {
     // 1. Add to my recipes (Clone it)
     const myCopy = { ...recipe, id: crypto.randomUUID(), isPublic: false, sourceUrl: `Community: ${recipe.author}` };
     const myRecipes = await storageService.getRecipes(myUserId);
     await storageService.saveRecipes([myCopy, ...myRecipes], myUserId);

     // 2. Simulate notifying the original author (Client-side simulation)
     // In a real app, this would be an API call: POST /api/recipe/${recipe.id}/save
     console.log(`[Social] Notified ${recipe.author} that you saved their recipe.`);
     return myCopy;
  },
  
  // Called when YOU cook a recipe
  markRecipeAsCooked: async (recipe: Recipe) => {
     // Logic to increment 'cooks' count on the server
     console.log(`[Social] Incrementing cook count for ${recipe.title}`);
  },

  saveProfile: async (profile: UserProfile, userId?: string) => {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    
    if (isSupabaseConfigured() && userId) {
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