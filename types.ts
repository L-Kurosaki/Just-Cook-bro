export interface Ingredient {
  name: string;
  amount: string;
  category?: string; // produce, spice, pantry
  owned?: boolean; // logic for "Checklist"
  imageUrl?: string; // For grocery visual confirmation
}

export interface Step {
  instruction: string;
  timeInSeconds?: number;
  tip?: string; // Gemini generated tip
  warning?: string; // "Don't burn it!"
  actionVerb?: string; // chop, boil, fry
}

export interface Review {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  date: string;
}

export interface SpotifyTrack {
  name: string;
  artist: string;
  albumArt?: string;
  uri: string;
  playedAt: string; // ISO string
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
  musicMood?: string; // Legacy suggestion, can still keep for initial vibes
  rating?: number;
  reviews?: Review[];
  isPremium?: boolean;
  author?: string;
  authorId?: string;
  isOffline?: boolean;
  isPublic?: boolean; // Community feature
  dietaryTags?: string[]; // vegan, keto
  allergens?: string[]; // peanuts, dairy
  
  // Social Stats
  saves?: number; // How many people added this to their cookbook
  cooks?: number; // How many people cooked this

  // Organization (Premium)
  userCollections?: string[]; // e.g. ["Desserts", "Family"]
}

export interface Notification {
  id: string;
  type: 'save' | 'cook' | 'review';
  message: string;
  date: string;
  read: boolean;
  recipeId?: string;
  actorName: string; // The person who performed the action
}

export interface UserProfile {
  id?: string;
  email?: string;
  name: string;
  dietaryPreferences: string[];
  allergies: string[];
  isPremium: boolean;
  isDeleteLocked: boolean; // Enforces the Add -> Delete -> Add -> Delete cycle
  musicHistory: SpotifyTrack[]; // Persistent log of songs listened to while cooking
  notifications?: Notification[];
  customCollections?: string[]; // User defined categories e.g. ["Family Recipes", "Desserts"]
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

export interface SubscriptionPackage {
  identifier: string;
  priceString: string;
  title: string;
  description: string;
}