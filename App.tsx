import React, { useState, useEffect, useRef } from 'react';
import { MemoryRouter, Routes, Route, useNavigate, useParams } from 'react-router-dom';
import Layout from './components/Layout';
import RecipeCard from './components/RecipeCard';
import CookingMode from './components/CookingMode';
import Paywall from './components/Paywall';
import Auth from './components/Auth';
import SplashScreen from './components/SplashScreen';
import ReviewSection from './components/ReviewSection';
import { Recipe, StoreLocation, UserProfile, Review, SpotifyTrack } from './types';
import { parseRecipeFromText, scanRecipeFromImage, findGroceryStores, extractTextFromImage, suggestRecipesFromImage, generateFullRecipeFromSuggestion } from './services/geminiService';
import { storageService } from './services/storageService';
import { purchases, REVENUE_CAT_API_KEY } from './services/revenueCatService';
import { supabase, isSupabaseConfigured } from './services/supabaseClient';
import { Camera, Link as LinkIcon, Plus, MapPin, CheckCircle, Circle, ArrowRight, ArrowLeft, Heart, ShoppingBag, Settings, Crown, LogOut, Edit3, Lock, Globe, Trash2, Image as ImageIcon, AlertTriangle, ScanText, Loader, ChefHat, Sparkles } from 'lucide-react';

// --- Helper Components ---

const ManualRecipeForm: React.FC<{ onSave: (r: Recipe) => void, onCancel: () => void }> = ({ onSave, onCancel }) => {
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [ingredientsText, setIngredientsText] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [isScanning, setIsScanning] = useState<'ingredients' | 'steps' | null>(null);
  
  const ingInputRef = useRef<HTMLInputElement>(null);
  const stepInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    // Basic Parsing
    const ingredients = ingredientsText.split('\n').filter(i => i.trim()).map(i => ({ name: i, amount: '' }));
    const steps = instructions.split('\n').filter(s => s.trim()).map(s => ({ instruction: s }));
    
    const newRecipe: Recipe = {
        id: crypto.randomUUID(),
        title,
        description: "Manually created",
        prepTime: "Varies",
        cookTime: "Varies",
        servings: 2,
        ingredients,
        steps,
        imageUrl: "https://picsum.photos/800/600",
        isPremium: false,
        reviews: [],
        isPublic
    };
    onSave(newRecipe);
  };

  const handleOCR = async (e: React.ChangeEvent<HTMLInputElement>, type: 'ingredients' | 'steps') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(type);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = (reader.result as string).replace("data:", "").replace(/^.+,/, "");
        try {
            const text = await extractTextFromImage(base64String, type);
            if (type === 'ingredients') {
                setIngredientsText(prev => prev + (prev ? '\n' : '') + text);
            } else {
                setInstructions(prev => prev + (prev ? '\n' : '') + text);
            }
        } catch (err) {
            alert("Could not scan text. Please try again.");
        } finally {
            setIsScanning(null);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error(error);
      setIsScanning(null);
    }
  };

  return (
    <div className="bg-white p-6 h-full flex flex-col animate-fade-in">
       <h2 className="text-xl font-bold mb-4">Create Recipe</h2>
       
       <label className="text-xs font-bold text-dark mb-1">Recipe Title</label>
       <input 
         className="w-full bg-secondary p-3 rounded-lg mb-4 text-sm font-medium" 
         placeholder="e.g. Grandma's Apple Pie" 
         value={title} 
         onChange={e => setTitle(e.target.value)} 
       />

       <div className="flex justify-between items-center mb-1">
         <label className="text-xs font-bold text-dark">Ingredients (one per line)</label>
         <button 
            onClick={() => ingInputRef.current?.click()}
            disabled={!!isScanning}
            className="text-xs text-gold flex items-center gap-1 font-bold disabled:opacity-50"
         >
            {isScanning === 'ingredients' ? <Loader size={12} className="animate-spin" /> : <ScanText size={12} />}
            Scan List
         </button>
         <input type="file" ref={ingInputRef} onChange={(e) => handleOCR(e, 'ingredients')} className="hidden" accept="image/*" />
       </div>
       <textarea 
         className="w-full bg-secondary p-3 rounded-lg mb-4 h-32 text-sm" 
         placeholder="- 2 apples&#10;- 1 cup flour" 
         value={ingredientsText} 
         onChange={e => setIngredientsText(e.target.value)} 
       />

       <div className="flex justify-between items-center mb-1">
         <label className="text-xs font-bold text-dark">Instructions</label>
         <button 
            onClick={() => stepInputRef.current?.click()}
            disabled={!!isScanning}
            className="text-xs text-gold flex items-center gap-1 font-bold disabled:opacity-50"
         >
            {isScanning === 'steps' ? <Loader size={12} className="animate-spin" /> : <ScanText size={12} />}
            Scan Steps
         </button>
         <input type="file" ref={stepInputRef} onChange={(e) => handleOCR(e, 'steps')} className="hidden" accept="image/*" />
       </div>
       <textarea 
         className="w-full bg-secondary p-3 rounded-lg mb-4 h-40 text-sm" 
         placeholder="1. Preheat oven...&#10;2. Mix ingredients..." 
         value={instructions} 
         onChange={e => setInstructions(e.target.value)} 
       />
       
       <div className="flex items-center gap-2 mb-6">
         <button onClick={() => setIsPublic(!isPublic)} className={`w-10 h-6 rounded-full p-1 transition-colors ${isPublic ? 'bg-gold' : 'bg-gray-300'}`}>
            <div className={`w-4 h-4 bg-white rounded-full transition-transform ${isPublic ? 'translate-x-4' : ''}`} />
         </button>
         <span className="text-sm">{isPublic ? 'Public to Community' : 'Private (My Cookbook)'}</span>
       </div>

       <div className="flex gap-4 mt-auto">
         <button onClick={onCancel} className="flex-1 py-3 text-midGrey font-bold text-sm">Cancel</button>
         <button onClick={handleSubmit} disabled={!title} className="flex-1 bg-gold text-white rounded-xl font-bold shadow-md text-sm">Save Recipe</button>
       </div>
    </div>
  );
};

// --- Screens ---

const HomeScreen: React.FC<{ recipes: Recipe[], onDelete: (id: string) => void, userProfile: UserProfile | null }> = ({ recipes, onDelete, userProfile }) => {
  const [activeTab, setActiveTab] = useState<'my_recipes' | 'grocery'>('my_recipes');
  const [activeFilter, setActiveFilter] = useState<string>('all');

  // Filter based on dietary
  const filteredRecipes = recipes.filter(r => {
      if (activeFilter === 'all') return true;
      if (activeFilter === 'offline') return r.isOffline;
      return true;
  });

  // Grocery List Logic
  const allIngredients = recipes.flatMap(r => r.ingredients);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  const toggleGroceryItem = (name: string) => {
    const next = new Set(checkedItems);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    setCheckedItems(next);
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-dark mb-1">Hey {userProfile?.name || 'Chef'},</h2>
        <p className="text-midGrey">You have {recipes.length} recipes saved.</p>
        {!userProfile?.isPremium && (
            <div className="text-xs text-orange-500 mt-1">Free Plan: {recipes.length}/20 recipes used.</div>
        )}
      </div>

      <div className="flex gap-4 mb-6 border-b border-secondary">
        <button className={`pb-2 text-sm font-bold ${activeTab === 'my_recipes' ? 'text-gold border-b-2 border-gold' : 'text-midGrey'}`} onClick={() => setActiveTab('my_recipes')}>My Cookbook</button>
        <button className={`pb-2 text-sm font-bold ${activeTab === 'grocery' ? 'text-gold border-b-2 border-gold' : 'text-midGrey'}`} onClick={() => setActiveTab('grocery')}>Grocery List</button>
      </div>

      {activeTab === 'my_recipes' ? (
        <div className="mb-6">
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
                <button onClick={() => setActiveFilter('all')} className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${activeFilter === 'all' ? 'bg-dark text-white' : 'bg-secondary text-midGrey'}`}>All</button>
                <button onClick={() => setActiveFilter('offline')} className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${activeFilter === 'offline' ? 'bg-dark text-white' : 'bg-secondary text-midGrey'}`}>Downloaded</button>
                {userProfile?.dietaryPreferences.map(pref => (
                     <span key={pref} className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 whitespace-nowrap">{pref}</span>
                ))}
            </div>

            {filteredRecipes.length === 0 ? (
            <div className="text-center py-10 bg-secondary rounded-xl border border-dashed border-midGrey/30">
                <p className="text-midGrey text-sm mb-4">No recipes found.</p>
                <p className="text-gold font-medium">Start cooking!</p>
            </div>
            ) : (
            filteredRecipes.map(r => (
                <div key={r.id} className="relative group">
                    <RecipeCard recipe={r} userProfile={userProfile} />
                    <button 
                        onClick={(e) => { e.preventDefault(); onDelete(r.id); }}
                        className={`absolute top-2 left-2 bg-white/90 p-2 rounded-full transition-all active:scale-95 shadow-sm ${
                           !userProfile?.isPremium && userProfile?.isDeleteLocked ? 'text-gray-400 cursor-not-allowed opacity-100' : 'text-red-500 opacity-0 group-hover:opacity-100 cursor-pointer'
                        }`}
                        title={!userProfile?.isPremium && userProfile?.isDeleteLocked ? "Add a recipe to unlock delete!" : "Delete Recipe"}
                    >
                        {!userProfile?.isPremium && userProfile?.isDeleteLocked ? <Lock size={16} /> : <Trash2 size={16} />}
                    </button>
                </div>
            ))
            )}
            
            {/* Helper text for the delete logic */}
            {!userProfile?.isPremium && userProfile?.isDeleteLocked && (
                <p className="text-[10px] text-center text-red-400 mt-2 bg-red-50 p-2 rounded-lg">
                    Delete Locked: Add a new recipe to unlock the delete function.
                </p>
            )}
        </div>
      ) : (
        <div className="space-y-4">
            {allIngredients.length === 0 && <p className="text-midGrey text-sm">Add recipes to generate your grocery list.</p>}
            {allIngredients.map((ing, idx) => {
                const isChecked = checkedItems.has(ing.name + idx);
                return (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-secondary rounded-lg" onClick={() => toggleGroceryItem(ing.name + idx)}>
                         {isChecked ? <CheckCircle className="text-gold w-5 h-5" /> : <Circle className="text-midGrey w-5 h-5" />}
                         {/* Visual Placeholder for confirmation */}
                         <div className="w-8 h-8 bg-gray-200 rounded-md flex items-center justify-center">
                            <ImageIcon size={12} className="text-gray-400" />
                         </div>
                         <span className={`${isChecked ? 'line-through text-midGrey' : 'text-dark'}`}>{ing.amount} {ing.name}</span>
                    </div>
                )
            })}
        </div>
      )}
    </div>
  );
};

const CommunityScreen: React.FC = () => {
    const [feed, setFeed] = useState<Recipe[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadFeed = async () => {
            const data = await storageService.getPublicRecipes();
            setFeed(data);
            setLoading(false);
        };
        loadFeed();
    }, []);

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-dark">Community</h2>
                <div className="bg-secondary p-2 rounded-full">
                    <Globe className="text-gold w-5 h-5" />
                </div>
            </div>

            {loading ? (
                <div className="text-center py-10 text-midGrey">Loading delicious ideas...</div>
            ) : (
                <div className="space-y-6">
                    {feed.map(recipe => (
                        <div key={recipe.id} className="bg-white rounded-xl shadow-sm border border-secondary overflow-hidden">
                            <div className="h-48 relative">
                                <img src={recipe.imageUrl} className="w-full h-full object-cover" alt={recipe.title} />
                                <div className="absolute bottom-2 left-2 bg-white/90 px-2 py-1 rounded-lg text-xs font-bold text-dark flex items-center gap-1">
                                    <ChefHat size={12} /> {recipe.author || "Chef"}
                                </div>
                            </div>
                            <div className="p-4">
                                <h3 className="font-bold text-lg mb-1">{recipe.title}</h3>
                                <p className="text-midGrey text-sm line-clamp-2 mb-3">{recipe.description}</p>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-gold font-bold">{recipe.cookTime}</span>
                                    <Heart className="w-5 h-5 text-midGrey hover:text-red-500 cursor-pointer" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const DiscoverScreen: React.FC<{ onAddRecipe: (r: Recipe) => void }> = ({ onAddRecipe }) => {
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState<string>("");
  const [showManual, setShowManual] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<{title: string, description: string}>>([]);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleTextSubmit = async () => {
    if (!inputText.trim()) return;
    setIsLoading(true);
    setLoadingStage("Parsing text...");
    try {
      const recipe = await parseRecipeFromText(inputText);
      onAddRecipe(recipe);
      navigate(`/recipe/${recipe.id}`);
    } catch (error) {
      alert("Oops! Couldn't extract a recipe. Try pasting specific ingredients or steps.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setLoadingStage("Analyzing food & Searching internet...");
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = (reader.result as string).replace("data:", "").replace(/^.+,/, "");
        setCurrentImage(base64String);
        try {
            // Step 1: Get Suggestions
            const options = await suggestRecipesFromImage(base64String);
            setSuggestions(options);
        } catch (err) {
            alert("Could not analyze image. Please try again.");
            setCurrentImage(null);
        } finally {
            setIsLoading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error(error);
      setIsLoading(false);
    }
  };

  const handleSelectSuggestion = async (suggestion: {title: string, description: string}) => {
      if (!currentImage) return;
      setIsLoading(true);
      setLoadingStage(`Creating recipe for ${suggestion.title}...`);
      try {
          // Step 2: Generate Full Recipe
          const recipe = await generateFullRecipeFromSuggestion(suggestion, currentImage);
          onAddRecipe(recipe);
          navigate(`/recipe/${recipe.id}`);
      } catch (e) {
          alert("Failed to generate details. Try another.");
      } finally {
          setIsLoading(false);
      }
  };

  if (showManual) {
      return <ManualRecipeForm onSave={(r) => { onAddRecipe(r); navigate(`/recipe/${r.id}`); }} onCancel={() => setShowManual(false)} />;
  }

  // --- UI: Loading ---
  if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-20 animate-pulse h-full">
           <div className="w-16 h-16 bg-gold rounded-full mb-6 flex items-center justify-center">
             <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
           </div>
           <p className="text-dark font-bold text-lg mb-2">Chef is working...</p>
           <p className="text-xs text-midGrey">{loadingStage}</p>
        </div>
      );
  }

  // --- UI: Selection Grid (Step 2) ---
  if (suggestions.length > 0) {
      return (
          <div className="p-6 h-full flex flex-col">
              <div className="flex items-center gap-2 mb-4">
                 <button onClick={() => { setSuggestions([]); setCurrentImage(null); }} className="p-1 rounded-full bg-secondary hover:bg-gray-300">
                     <ArrowLeft size={20} />
                 </button>
                 <h2 className="text-xl font-bold text-dark">Found 6 Recipes</h2>
              </div>
              <p className="text-sm text-midGrey mb-4">Select the one that matches your food best.</p>
              
              <div className="grid grid-cols-1 gap-4 overflow-y-auto pb-20">
                  {suggestions.map((s, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => handleSelectSuggestion(s)}
                        className="bg-white border border-secondary p-4 rounded-xl shadow-sm active:scale-[0.98] transition-all hover:border-gold/50 cursor-pointer"
                      >
                          <div className="flex justify-between items-start mb-2">
                              <h3 className="font-bold text-dark text-lg">{s.title}</h3>
                              <Sparkles size={16} className="text-gold" />
                          </div>
                          <p className="text-xs text-midGrey leading-relaxed">{s.description}</p>
                      </div>
                  ))}
              </div>
          </div>
      );
  }

  // --- UI: Initial State ---
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-dark mb-6">Add a Recipe</h2>

      <div className="space-y-6">
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="bg-secondary p-6 rounded-xl flex items-center justify-between cursor-pointer active:scale-[0.98] transition-transform border border-transparent hover:border-gold/30"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-gold shadow-sm">
                <Camera size={24} />
              </div>
              <div>
                <h3 className="font-bold text-dark text-lg">Generate Recipe</h3>
                <p className="text-xs text-midGrey">Scan food -> Get Internet Recipes</p>
              </div>
            </div>
            <ArrowRight size={20} className="text-midGrey" />
            <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
          </div>

          <div 
            onClick={() => setShowManual(true)}
            className="bg-secondary p-6 rounded-xl flex items-center justify-between cursor-pointer active:scale-[0.98] transition-transform border border-transparent hover:border-gold/30"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-gold shadow-sm">
                <Edit3 size={24} />
              </div>
              <div>
                <h3 className="font-bold text-dark text-lg">Create Manually</h3>
                <p className="text-xs text-midGrey">Type or OCR scan text</p>
              </div>
            </div>
            <ArrowRight size={20} className="text-midGrey" />
          </div>

          <div className="bg-white border border-secondary p-6 rounded-xl shadow-sm">
            <div className="flex items-center gap-2 mb-4">
                <LinkIcon size={18} className="text-gold" />
                <h3 className="font-bold text-dark">Paste Link or Text</h3>
            </div>
            <textarea
              className="w-full bg-secondary p-4 rounded-lg text-sm text-dark focus:outline-none focus:ring-2 focus:ring-gold/50 min-h-[120px]"
              placeholder="Paste a URL or type instructions here..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
            <button 
              onClick={handleTextSubmit}
              disabled={!inputText}
              className={`w-full mt-4 py-3 rounded-xl font-bold text-sm transition-colors ${inputText ? 'bg-gold text-white shadow-md' : 'bg-secondary text-midGrey'}`}
            >
              Parse Recipe
            </button>
          </div>
        </div>
    </div>
  );
};

const ProfileScreen: React.FC<{ userProfile: UserProfile, setPremium: (val: boolean) => void, onUpdateProfile: (p: UserProfile) => void, onLogout: () => void }> = ({ userProfile, setPremium, onUpdateProfile, onLogout }) => {
    const [showPaywall, setShowPaywall] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [dietary, setDietary] = useState(userProfile.dietaryPreferences.join(', '));
    const [allergies, setAllergies] = useState(userProfile.allergies.join(', '));

    const handleSaveProfile = () => {
        onUpdateProfile({
            ...userProfile,
            dietaryPreferences: dietary.split(',').map(s => s.trim()).filter(s => s),
            allergies: allergies.split(',').map(s => s.trim()).filter(s => s)
        });
        setEditMode(false);
    };

    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold text-dark mb-6">Profile</h2>
            
            <div className="bg-secondary p-6 rounded-2xl flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-gold text-white rounded-full flex items-center justify-center text-xl font-bold shadow-lg">
                    {userProfile.name.charAt(0)}
                </div>
                <div>
                    <h3 className="font-bold text-lg">{userProfile.name}</h3>
                    <div className="flex items-center gap-1">
                        {userProfile.isPremium ? (
                            <span className="bg-dark text-gold text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Crown size={10} /> PRO MEMBER
                            </span>
                        ) : (
                            <span className="bg-white text-midGrey text-[10px] font-bold px-2 py-0.5 rounded-full border border-gray-200">
                                Free Plan
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Dietary Settings */}
            <div className="bg-white border border-secondary rounded-xl p-4 mb-6">
                <div className="flex justify-between items-center mb-4">
                     <h3 className="font-bold text-sm">Dietary & Allergies</h3>
                     <button onClick={() => editMode ? handleSaveProfile() : setEditMode(true)} className="text-xs text-gold font-bold">
                        {editMode ? "Save" : "Edit"}
                     </button>
                </div>
                
                {editMode ? (
                    <div className="space-y-3">
                        <div>
                            <label className="text-xs text-midGrey">Dietary (comma separated)</label>
                            <input className="w-full bg-secondary p-2 rounded text-sm" value={dietary} onChange={e => setDietary(e.target.value)} placeholder="e.g. Vegan, Keto" />
                        </div>
                        <div>
                            <label className="text-xs text-midGrey">Allergies (comma separated)</label>
                            <input className="w-full bg-secondary p-2 rounded text-sm" value={allergies} onChange={e => setAllergies(e.target.value)} placeholder="e.g. Peanuts, Gluten" />
                        </div>
                    </div>
                ) : (
                    <div className="space-y-2">
                        <div className="flex flex-wrap gap-2">
                            {userProfile.dietaryPreferences.length === 0 && <span className="text-xs text-midGrey">No preferences set</span>}
                            {userProfile.dietaryPreferences.map(p => <span key={p} className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">{p}</span>)}
                        </div>
                        <div className="flex flex-wrap gap-2">
                             {userProfile.allergies.length === 0 && <span className="text-xs text-midGrey">No allergies set</span>}
                             {userProfile.allergies.map(p => <span key={p} className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">No {p}</span>)}
                        </div>
                    </div>
                )}
            </div>

            {!userProfile.isPremium && (
                <div 
                    onClick={() => setShowPaywall(true)}
                    className="bg-gradient-to-r from-gold to-[#E5C265] p-6 rounded-2xl mb-8 text-white shadow-lg cursor-pointer transform transition-transform hover:scale-[1.02]"
                >
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-lg">Upgrade to Pro</h3>
                        <Crown className="w-6 h-6" />
                    </div>
                    <p className="text-sm opacity-90 mb-4">Unlimited recipes, offline access, and zero ads.</p>
                    <button className="bg-white text-gold font-bold text-xs px-4 py-2 rounded-lg">View Plans</button>
                </div>
            )}

            <button 
                onClick={onLogout}
                className="w-full p-4 bg-white border border-secondary rounded-xl flex items-center justify-between text-red-500"
            >
                <span className="flex items-center gap-3"><LogOut size={18} /> Sign Out</span>
            </button>

            {showPaywall && <Paywall onClose={() => setShowPaywall(false)} onSuccess={() => { setPremium(true); setShowPaywall(false); }} />}
        </div>
    );
};

const RecipeDetailScreen: React.FC<{ 
    recipes: Recipe[], 
    userProfile: UserProfile, 
    setShowPaywall: (v: boolean) => void,
    onAddReview: (recipeId: string, rating: number, comment: string) => void,
    onToggleOffline: (recipeId: string) => void
}> = ({ recipes, userProfile, setShowPaywall, onAddReview, onToggleOffline }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const recipe = recipes.find(r => r.id === id);
  const [nearbyStores, setNearbyStores] = useState<{ [key: string]: StoreLocation[] }>({});
  const [loadingStores, setLoadingStores] = useState<{ [key: string]: boolean }>({});

  if (!recipe) return <div>Not found</div>;

  const findStoreForIngredient = async (ingredientName: string) => {
    setLoadingStores(prev => ({ ...prev, [ingredientName]: true }));
    try {
        navigator.geolocation.getCurrentPosition(async (position) => {
            const stores = await findGroceryStores(ingredientName, position.coords.latitude, position.coords.longitude);
            setNearbyStores(prev => ({ ...prev, [ingredientName]: stores }));
            setLoadingStores(prev => ({ ...prev, [ingredientName]: false }));
        }, (err) => {
            alert("Need location access to find stores.");
            setLoadingStores(prev => ({ ...prev, [ingredientName]: false }));
        });
    } catch (e) {
        setLoadingStores(prev => ({ ...prev, [ingredientName]: false }));
    }
  };

  const handleStartCooking = () => {
      if (recipe.isPremium && !userProfile.isPremium) {
          setShowPaywall(true);
      } else {
          navigate(`/cook/${recipe.id}`);
      }
  };

  const handleDownload = () => {
      if (!userProfile.isPremium) {
           const currentOffline = recipes.filter(r => r.isOffline).length;
           if (currentOffline >= 10 && !recipe.isOffline) {
               alert("Free limit reached: 10 offline recipes. Upgrade to save more!");
               return;
           }
      }
      onToggleOffline(recipe.id);
  };

  const handleShare = () => {
      // In MemoryRouter, the window.location.href does not reflect the route.
      // We construct a theoretical share link.
      const url = `${window.location.origin}/#/recipe/${recipe.id}`;
      navigator.clipboard.writeText(url);
      alert("Link copied! " + url);
  };

  // Check Allergy again for detail view warning
   const hasAllergy = userProfile?.allergies?.some(allergy => 
    recipe.allergens?.map(a => a.toLowerCase()).includes(allergy.toLowerCase()) ||
    recipe.ingredients.some(i => i.name.toLowerCase().includes(allergy.toLowerCase()))
  );

  return (
    <div className="pb-20">
      <div className="relative h-72 bg-gray-200">
        <img src={recipe.imageUrl} alt={recipe.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-6">
          <div className="w-full">
            <div className="flex gap-2 mb-2">
                <span className="bg-gold text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">
                    {recipe.musicMood || "Cooking Vibes"}
                </span>
            </div>
            <h1 className="text-3xl font-bold text-white leading-tight">{recipe.title}</h1>
            <div className="flex justify-between items-end mt-2">
                <p className="text-white/80 text-sm">{recipe.description}</p>
                <div className="flex gap-2">
                     <button onClick={handleShare} className="bg-white/20 p-2 rounded-full text-white"><Globe size={18} /></button>
                     <button onClick={handleDownload} className={`p-2 rounded-full text-white ${recipe.isOffline ? 'bg-green-500' : 'bg-white/20'}`}>
                        {recipe.isOffline ? <CheckCircle size={18} /> : <ArrowRight size={18} className="rotate-90" />}
                     </button>
                </div>
            </div>
          </div>
        </div>
        <button onClick={() => navigate(-1)} className="absolute top-4 left-4 bg-white/20 backdrop-blur-md p-2 rounded-full text-white hover:bg-white/30">
            <ArrowLeft size={24} />
        </button>
      </div>

      <div className="p-6">
        {hasAllergy && (
             <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-6 flex items-start gap-3">
                 <AlertTriangle className="shrink-0 mt-1" size={20} />
                 <div>
                     <h4 className="font-bold text-sm uppercase">Allergy Warning</h4>
                     <p className="text-xs">This recipe contains ingredients that match your allergy profile.</p>
                 </div>
             </div>
        )}

        <button 
            onClick={handleStartCooking}
            className={`w-full font-bold py-4 rounded-xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 mb-8 ${recipe.isPremium && !userProfile.isPremium ? 'bg-dark text-white' : 'bg-gold text-white'}`}
        >
            {recipe.isPremium && !userProfile.isPremium ? <><Crown size={18} /> Unlock to Cook</> : 'Start Cooking'}
        </button>

        <div className="mb-8">
          <h3 className="font-bold text-dark mb-4 text-lg">Ingredients</h3>
          <div className="space-y-3">
            {recipe.ingredients.map((ing, idx) => {
                const stores = nearbyStores[ing.name];
                const isLoading = loadingStores[ing.name];

                return (
                    <div key={idx} className="p-3 rounded-lg border bg-white border-secondary">
                        <div className="flex items-center justify-between">
                            <span className="text-dark font-medium">{ing.amount} {ing.name}</span>
                            <button 
                                onClick={() => findStoreForIngredient(ing.name)}
                                className="text-xs text-gold font-bold flex items-center gap-1 px-2 py-1 bg-gold/5 rounded hover:bg-gold/10"
                            >
                                <MapPin size={12} />
                                {isLoading ? 'Searching...' : 'Find Store'}
                            </button>
                        </div>
                        {stores && stores.length > 0 && (
                            <div className="mt-3 pl-2 animate-fade-in border-t border-dashed border-gray-200 pt-2">
                                <ul className="space-y-1">
                                    {stores.map((store, sIdx) => (
                                        <li key={sIdx} className="text-xs">
                                            <a href={store.uri} target="_blank" rel="noreferrer" className="text-dark underline hover:text-gold">{store.name}</a>
                                            <span className="text-midGrey ml-1">({store.address})</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                );
            })}
          </div>
        </div>

        <ReviewSection 
            reviews={recipe.reviews || []} 
            onAddReview={(r, c) => onAddReview(recipe.id, r, c)} 
            canReview={true} 
        />
      </div>
    </div>
  );
};

// --- Main App Component ---

const App: React.FC = () => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile>({
      name: "Guest",
      isPremium: false,
      dietaryPreferences: [],
      allergies: [],
      isDeleteLocked: false,
      musicHistory: [] // Init empty history
  });
  const [showPaywall, setShowPaywall] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);

  // Initialize Data
  useEffect(() => {
    const init = async () => {
        if (isSupabaseConfigured()) {
            const { data: { session } } = await supabase.auth.getSession();
            setUser(session?.user || null);
            if (session?.user) {
                // Fetch full profile from Supabase/Storage
                const savedProfile = storageService.getProfile();
                if (savedProfile) setUserProfile(savedProfile);
            }
        } else {
             const savedProfile = storageService.getProfile();
             if (savedProfile) setUserProfile(savedProfile);
        }
        
        await purchases.configure(REVENUE_CAT_API_KEY);
        const premiumStatus = await purchases.restorePurchases();
        setUserProfile(prev => ({ ...prev, isPremium: premiumStatus }));

        setLoading(false);
    };
    init();
  }, []);

  // Load Recipes
  useEffect(() => {
    const loadRecipes = async () => {
        const savedRecipes = await storageService.getRecipes(user?.id);
        if (savedRecipes.length > 0) setRecipes(savedRecipes);
    };
    if (!loading) loadRecipes();
  }, [user, loading]);

  const addRecipe = (newRecipe: Recipe) => {
    // Limit Check
    if (!userProfile.isPremium && recipes.length >= 20) {
        alert("Free limit reached (20 recipes). Upgrade to Pro to add more!");
        setShowPaywall(true);
        return;
    }
    const updated = [newRecipe, ...recipes];
    setRecipes(updated);
    storageService.saveRecipes(updated, user?.id);

    // UNLOCK DELETE logic (Free Tier)
    if (!userProfile.isPremium && userProfile.isDeleteLocked) {
        const newProfile = { ...userProfile, isDeleteLocked: false };
        setUserProfile(newProfile);
        storageService.saveProfile(newProfile, user?.id);
    }
  };

  const deleteRecipe = (id: string) => {
      // DELETE LOCK LOGIC (Free Tier)
      if (!userProfile.isPremium && userProfile.isDeleteLocked) {
          alert("Free Tier Rule: You must ADD a recipe before you can remove another one.");
          return;
      }
      
      const updated = recipes.filter(r => r.id !== id);
      setRecipes(updated);
      storageService.saveRecipes(updated, user?.id);

      // LOCK DELETE Logic (Free Tier)
      if (!userProfile.isPremium) {
          const newProfile = { ...userProfile, isDeleteLocked: true };
          setUserProfile(newProfile);
          storageService.saveProfile(newProfile, user?.id);
      }
  };

  const updateProfile = (p: UserProfile) => {
      setUserProfile(p);
      storageService.saveProfile(p, user?.id);
  };

  // NEW: Save Music History
  const addMusicToHistory = (track: SpotifyTrack) => {
      const newHistory = [...(userProfile.musicHistory || []), track];
      const newProfile = { ...userProfile, musicHistory: newHistory };
      updateProfile(newProfile);
  };

  const toggleOffline = (id: string) => {
      const updated = recipes.map(r => r.id === id ? { ...r, isOffline: !r.isOffline } : r);
      setRecipes(updated);
      storageService.saveRecipes(updated, user?.id);
  };

  const addReview = (recipeId: string, rating: number, comment: string) => {
      const review: Review = {
          id: crypto.randomUUID(),
          userId: user?.id || 'anon',
          userName: userProfile.name,
          rating,
          comment,
          date: new Date().toISOString()
      };
      
      const updated = recipes.map(r => 
        r.id === recipeId 
            ? { ...r, reviews: [review, ...(r.reviews || [])] }
            : r
      );
      setRecipes(updated);
      storageService.saveRecipes(updated, user?.id);
  };

  const handleLogout = async () => {
      if (isSupabaseConfigured()) await supabase.auth.signOut();
      setUser(null);
      localStorage.removeItem("jcb_premium_status");
      localStorage.removeItem("jcb_spotify_token"); // Clear Spotify token too
  };

  // 1. Splash Screen
  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  // 2. Loading State (Data)
  if (loading) return <div className="min-h-screen flex items-center justify-center text-gold">Loading Kitchen...</div>;

  // 3. Auth State
  if (!user && isSupabaseConfigured()) {
      return (
          <div className="bg-primary min-h-screen">
              <Auth onAuthSuccess={(u) => setUser(u)} />
          </div>
      );
  }

  // 4. Main App
  return (
    <MemoryRouter>
      <Routes>
        <Route path="/" element={<Layout><HomeScreen recipes={recipes} onDelete={deleteRecipe} userProfile={userProfile} /></Layout>} />
        <Route path="/discover" element={<Layout><DiscoverScreen onAddRecipe={addRecipe} /></Layout>} />
        <Route path="/community" element={<Layout><CommunityScreen /></Layout>} />
        <Route path="/profile" element={<Layout><ProfileScreen userProfile={userProfile} setPremium={(val) => updateProfile({...userProfile, isPremium: val})} onUpdateProfile={updateProfile} onLogout={handleLogout} /></Layout>} />
        <Route path="/recipe/:id" element={<Layout>
            <RecipeDetailScreen 
                recipes={recipes} 
                userProfile={userProfile} 
                setShowPaywall={setShowPaywall} 
                onAddReview={addReview}
                onToggleOffline={toggleOffline}
            />
        </Layout>} />
        <Route path="/cook/:id" element={<CookingMode recipes={recipes} onAddMusicToHistory={addMusicToHistory} />} />
      </Routes>
      
      {showPaywall && (
        <Paywall onClose={() => setShowPaywall(false)} onSuccess={() => { updateProfile({...userProfile, isPremium: true}); setShowPaywall(false); }} />
      )}
    </MemoryRouter>
  );
};

export default App;