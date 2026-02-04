export interface Ingredient {
  name: string;
  amount: string;
  category?: string; // produce, spice, pantry
  owned?: boolean; // logic for "Checklist"
}

export interface Step {
  instruction: string;
  timeInSeconds?: number;
  tip?: string; // Gemini generated tip
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  prepTime: string;
  cookTime: string;
  servings: number;
  ingredients: Ingredient[];
  steps: Step[];
  imageUrl?: string;
  sourceUrl?: string;
  tags?: string[];
  musicMood?: string; // "Upbeat Jazz", "Lo-fi Beats"
  rating?: number;
  isPremium?: boolean;
}

export interface UserProfile {
  name: string;
  dietaryPreferences: string[];
  allergies: string[];
  isPremium: boolean;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface StoreLocation {
  name: string;
  address: string;
  rating?: number;
  openNow?: boolean;
  uri?: string;
}