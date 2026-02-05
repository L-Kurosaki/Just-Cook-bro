import React, { useState, useEffect, useRef } from 'react';
import { MemoryRouter, Routes, Route, useNavigate, useParams } from 'react-router-dom';
import Layout from './components/Layout';
import RecipeCard from './components/RecipeCard';
import CookingMode from './components/CookingMode';
import Paywall from './components/Paywall';
import Auth from './components/Auth';
import SplashScreen from './components/SplashScreen';
import ReviewSection from './components/ReviewSection';
import NotificationsScreen from './components/NotificationsScreen';
import { Recipe, StoreLocation, UserProfile, Review, SpotifyTrack } from './types';
import { parseRecipeFromText, scanRecipeFromImage, findGroceryStores, extractTextFromImage, suggestRecipesFromImage, generateFullRecipeFromSuggestion, generateRecipeFromVideoFrames, extractRecipeFromUrl } from './services/geminiService';
import { storageService } from './services/storageService';
import { purchases, REVENUE_CAT_API_KEY } from './services/revenueCatService';
import { supabase, isSupabaseConfigured } from './services/supabaseClient';
import { Camera, Link as LinkIcon, Plus, MapPin, CheckCircle, Circle, ArrowRight, ArrowLeft, Heart, ShoppingBag, Settings, Crown, LogOut, Edit3, Lock, Globe, Trash2, Image as ImageIcon, AlertTriangle, ScanText, Loader, ChefHat, Sparkles, Video, Play, Film, Eye, MonitorPlay, Bookmark, Download, FolderPlus, Folder, X, Filter, Leaf, Music, Share2, Info } from 'lucide-react';

// Fix for ImageCapture type missing in standard TS libs
declare class ImageCapture {
  constructor(track: MediaStreamTrack);
  grabFrame(): Promise<ImageBitmap>;
}

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

const HomeScreen: React.FC<{ 
    recipes: Recipe[], 
    onDelete: (id: string) => void, 
    userProfile: UserProfile | null,
    onCreateCollection: (name: string) => void,
    onDeleteCollection: (name: string) => void,
    setShowPaywall: (v: boolean) => void
}> = ({ recipes, onDelete, userProfile, onCreateCollection, onDeleteCollection, setShowPaywall }) => {
  const [activeTab, setActiveTab] = useState<'my_recipes' | 'grocery'>('my_recipes');
  const [activeFilter, setActiveFilter] = useState<string>('all'); 
  const [newCollectionName, setNewCollectionName] = useState("");
  const [showAddCollection, setShowAddCollection] = useState(false);
  const [strictMode, setStrictMode] = useState(false); // Dietary Filter Toggle

  // Filter Logic
  const filteredRecipes = recipes.filter(r => {
      // 1. Basic Filters (Offline / Collection)
      let matchesCategory = true;
      if (activeFilter === 'all') matchesCategory = true;
      else if (activeFilter === 'offline') matchesCategory = r.isOffline;
      else if (userProfile?.customCollections?.includes(activeFilter)) {
          matchesCategory = r.userCollections?.includes(activeFilter);
      }
      
      if (!matchesCategory) return false;

      // 2. Strict Dietary Mode Logic
      if (strictMode && userProfile) {
          // A. ALLERGY CHECK (Exclusion)
          // Exclude if any user allergy matches recipe allergens OR ingredients
          const hasAllergy = userProfile.allergies.some(allergy => {
               const allergyLower = allergy.toLowerCase();
               const matchesTag = r.allergens?.some(a => a.toLowerCase().includes(allergyLower));
               const matchesIngredient = r.ingredients.some(i => i.name.toLowerCase().includes(allergyLower));
               return matchesTag || matchesIngredient;
          });
          
          if (hasAllergy) return false;

          // B. PREFERENCE CHECK (Inclusion)
          // Logic: Recipe MUST contain tags for ALL user preferences (Strict AND logic)
          // e.g. User = Vegan -> Recipe must have "Vegan"
          if (userProfile.dietaryPreferences.length > 0) {
              const meetsDiet = userProfile.dietaryPreferences.every(pref => 
                  r.dietaryTags?.some(tag => tag.toLowerCase() === pref.toLowerCase())
              );
              // Note: If recipe has NO tags but user has preferences, we hide it to be safe in strict mode.
              if (!meetsDiet) return false;
          }
      }

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

  const handleAddCollection = () => {
      if (!userProfile?.isPremium) {
          setShowPaywall(true);
          return;
      }
      setShowAddCollection(true);
  };

  const confirmAddCollection = () => {
      if(newCollectionName.trim()) {
          onCreateCollection(newCollectionName.trim());
          setNewCollectionName("");
          setShowAddCollection(false);
      }
  };

  const handleDeleteCollection = (e: React.MouseEvent, col: string) => {
      e.stopPropagation();
      if (!userProfile?.isPremium) {
          setShowPaywall(true);
          return;
      }
      if (window.confirm(`Delete the "${col}" collection? Recipes inside will be kept.`)) {
          onDeleteCollection(col);
          if (activeFilter === col) setActiveFilter('all');
      }
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-start">
        <div>
            <h2 className="text-2xl font-bold text-dark mb-1">Hey {userProfile?.name || 'Chef'},</h2>
            <p className="text-midGrey">You have {recipes.length} recipes saved.</p>
        </div>
        
        {/* Strict Mode Toggle */}
        <div 
            onClick={() => setStrictMode(!strictMode)}
            className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all cursor-pointer border ${strictMode ? 'bg-green-100 border-green-300' : 'bg-secondary border-transparent'}`}
        >
            <Leaf size={20} className={strictMode ? 'text-green-600' : 'text-midGrey'} />
            <span className={`text-[10px] font-bold mt-1 ${strictMode ? 'text-green-700' : 'text-midGrey'}`}>
                {strictMode ? 'Strict Diet' : 'All Foods'}
            </span>
        </div>
      </div>

      <div className="flex gap-4 mb-6 border-b border-secondary">
        <button className={`pb-2 text-sm font-bold ${activeTab === 'my_recipes' ? 'text-gold border-b-2 border-gold' : 'text-midGrey'}`} onClick={() => setActiveTab('my_recipes')}>My Cookbook</button>
        <button className={`pb-2 text-sm font-bold ${activeTab === 'grocery' ? 'text-gold border-b-2 border-gold' : 'text-midGrey'}`} onClick={() => setActiveTab('grocery')}>Grocery List</button>
      </div>

      {activeTab === 'my_recipes' ? (
        <div className="mb-6">
            {/* Horizontal Scrollable Filters / Collections */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide items-center">
                <button onClick={() => setActiveFilter('all')} className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${activeFilter === 'all' ? 'bg-dark text-white' : 'bg-secondary text-midGrey'}`}>All</button>
                <button onClick={() => setActiveFilter('offline')} className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${activeFilter === 'offline' ? 'bg-dark text-white' : 'bg-secondary text-midGrey'}`}>Downloaded</button>
                
                {/* User Created Collections */}
                {userProfile?.customCollections?.map(col => (
                    <button 
                        key={col} 
                        onClick={() => setActiveFilter(col)} 
                        className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1 group ${activeFilter === col ? 'bg-gold text-white' : 'bg-secondary text-midGrey'}`}
                    >
                        {activeFilter === col && <Folder size={10} fill="currentColor" />} 
                        {col}
                        {userProfile.isPremium && (
                            <div 
                                onClick={(e) => handleDeleteCollection(e, col)}
                                className="ml-1 p-0.5 rounded-full hover:bg-red-500 hover:text-white text-current transition-colors opacity-60 hover:opacity-100"
                            >
                                <X size={10} />
                            </div>
                        )}
                    </button>
                ))}

                {/* Create Collection Button */}
                <button onClick={handleAddCollection} className="px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap bg-secondary text-gold border border-gold/30 flex items-center gap-1 hover:bg-gold hover:text-white transition-colors">
                    {userProfile?.isPremium ? <Plus size={12} /> : <Lock size={10} />}
                    New Category
                </button>
            </div>

            {/* Inline Add Collection Form */}
            {showAddCollection && (
                <div className="mb-4 bg-secondary p-3 rounded-xl flex gap-2 animate-fade-in">
                    <input 
                        autoFocus
                        className="flex-1 bg-white rounded-lg px-3 py-1 text-sm outline-none"
                        placeholder="e.g. Desserts, Family Secrets"
                        value={newCollectionName}
                        onChange={(e) => setNewCollectionName(e.target.value)}
                    />
                    <button onClick={confirmAddCollection} className="bg-gold text-white px-3 rounded-lg text-xs font-bold">Add</button>
                    <button onClick={() => setShowAddCollection(false)} className="text-midGrey px-2"><X size={16} /></button>
                </div>
            )}

            {/* Strict Mode Info Banner */}
            {strictMode && (
                <div className="mb-4 bg-green-50 border border-green-100 p-3 rounded-xl flex items-center gap-3 animate-fade-in">
                    <Filter size={16} className="text-green-600" />
                    <div className="text-xs text-green-800">
                        <span className="font-bold">Strict Mode Active:</span> Hiding allergens ({userProfile?.allergies.join(', ') || 'None'}) and enforcing preferences ({userProfile?.dietaryPreferences.join(', ') || 'None'}).
                    </div>
                </div>
            )}

            {filteredRecipes.length === 0 ? (
            <div className="text-center py-10 bg-secondary rounded-xl border border-dashed border-midGrey/30">
                <p className="text-midGrey text-sm mb-4">No recipes found.</p>
                {strictMode && <p className="text-xs text-red-400 mb-2">Try turning off Strict Mode or updating your profile.</p>}
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

const CommunityScreen: React.FC<{ onSaveRecipe: (r: Recipe) => void }> = ({ onSaveRecipe }) => {
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

    const handleSave = (e: React.MouseEvent, recipe: Recipe) => {
        e.preventDefault();
        onSaveRecipe(recipe); // This will handle the limit check inside App
    };

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
                                
                                {/* Music Vibes Badge */}
                                {recipe.sharedMusicTrack && (
                                    <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full text-[10px] font-bold text-white flex items-center gap-1 border border-white/20">
                                        <Music size={10} className="text-[#1DB954]" />
                                        Vibing to {recipe.sharedMusicTrack.name}
                                    </div>
                                )}
                            </div>
                            
                            <div className="p-4">
                                <h3 className="font-bold text-lg mb-1">{recipe.title}</h3>
                                
                                {/* Attribution Section */}
                                <div className="mb-3">
                                    <div className="flex items-center gap-1 text-xs text-dark font-bold">
                                        <ChefHat size={12} className="text-gold" />
                                        {recipe.originalAuthor || recipe.author || "Community Chef"}
                                        {recipe.originalSource && <span className="text-midGrey font-normal"> via {recipe.originalSource}</span>}
                                    </div>
                                    {recipe.socialHandle && (
                                        <div className="text-[10px] text-blue-500 ml-4">
                                            {recipe.socialHandle}
                                        </div>
                                    )}
                                </div>

                                <p className="text-midGrey text-sm line-clamp-2 mb-3">{recipe.description}</p>
                                
                                <div className="flex items-center justify-between mb-3 border-t border-dashed border-gray-100 pt-2">
                                    <div className="flex gap-4 text-xs text-midGrey">
                                        <span className="flex items-center gap-1"><Bookmark size={12} /> {recipe.saves || 0} saved</span>
                                        <span className="flex items-center gap-1"><Heart size={12} /> {recipe.cooks || 0} cooked</span>
                                    </div>
                                    {/* Comments disabled hint */}
                                    <div className="text-[10px] text-gray-300 flex items-center gap-1">
                                        <Lock size={8} /> Comments locked
                                    </div>
                                </div>

                                <button 
                                    onClick={(e) => handleSave(e, recipe)}
                                    className="w-full py-3 bg-secondary hover:bg-gold hover:text-white text-dark rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
                                >
                                    <Download size={16} /> Save to Unlock & View
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const DiscoverScreen: React.FC<{ onAddRecipe: (r: Recipe) => void, userProfile: UserProfile }> = ({ onAddRecipe, userProfile }) => {
  const [activeMode, setActiveMode] = useState<'scan' | 'smart_link'>('scan');
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState<string>("");
  const [showManual, setShowManual] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<{title: string, description: string}>>([]);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  
  // Smart Link State
  const [videoUrl, setVideoUrl] = useState("");
  const [embedHtml, setEmbedHtml] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allergies = userProfile.allergies || [];
  const diets = userProfile.dietaryPreferences || [];

  // --- 1. HANDLE TEXT/LINK ANALYSIS (FALLBACK) ---
  const handleTextSubmit = async () => {
    if (!inputText.trim()) return;
    setIsLoading(true);
    setLoadingStage("Analyzing Link with Google Search...");
    try {
      // If it looks like a URL, use the enhanced URL extractor
      if (inputText.startsWith('http')) {
        const recipe = await extractRecipeFromUrl(inputText, allergies, diets);
        onAddRecipe(recipe);
        navigate(`/recipe/${recipe.id}`);
      } else {
        const recipe = await parseRecipeFromText(inputText, allergies, diets);
        onAddRecipe(recipe);
        navigate(`/recipe/${recipe.id}`);
      }
    } catch (error) {
      alert("Oops! Couldn't extract a recipe. Try checking the URL.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- 2. HANDLE VIDEO EMBEDDING ---
  const loadVideo = () => {
      if (!videoUrl) return;
      // Simple YouTube ID extraction
      const ytMatch = videoUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^#&?]*).*/);
      if (ytMatch) {
          setEmbedHtml(`https://www.youtube.com/embed/${ytMatch[1]}`);
      } else {
          // Fallback or generic handling - we still set it so the user knows we 'loaded' it contextually
          setEmbedHtml(null); 
          alert("Currently optimized for YouTube. For other sites, ensure the video is visible on your screen for 'AI Watch'.");
      }
  };

  // --- 3. HANDLE SCREEN CAPTURE (AI EYES) ---
  const startScreenCapture = async () => {
    try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
        const track = stream.getVideoTracks()[0];
        const imageCapture = new ImageCapture(track);
        
        setIsCapturing(true);
        setLoadingStage("AI Eyes are watching... Play the video!");
        setIsLoading(true); // Show loading overlay but keep it minimal or custom

        const frames: string[] = [];
        const captureInterval = setInterval(async () => {
            if (frames.length >= 10) {
                stopCapture();
                return;
            }
            try {
                const bitmap = await imageCapture.grabFrame();
                const canvas = document.createElement('canvas');
                canvas.width = bitmap.width / 2; // Downscale for performance
                canvas.height = bitmap.height / 2;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
                const base64 = canvas.toDataURL('image/jpeg', 0.6).replace(/^.+,/, "");
                frames.push(base64);
                setLoadingStage(`Captured frame ${frames.length}/10...`);
            } catch (e) {
                console.error("Frame capture error", e);
            }
        }, 2000); // Capture every 2 seconds

        const stopCapture = async () => {
            clearInterval(captureInterval);
            track.stop();
            setIsCapturing(false);
            setLoadingStage("Analyzing captured video footage...");
            
            try {
                const recipe = await generateRecipeFromVideoFrames(frames, allergies, diets);
                onAddRecipe(recipe);
                navigate(`/recipe/${recipe.id}`);
            } catch (e) {
                alert("Could not analyze video footage.");
                setIsLoading(false);
            }
        };

        // If user manually stops sharing
        track.onended = () => {
             if (frames.length > 0) stopCapture();
             else {
                 setIsCapturing(false);
                 setIsLoading(false);
             }
        };

    } catch (err) {
        console.error("Screen capture cancelled", err);
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
            const options = await suggestRecipesFromImage(base64String, allergies, diets);
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
          const recipe = await generateFullRecipeFromSuggestion(suggestion, currentImage, allergies, diets);
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
        <div className="flex flex-col items-center justify-center py-20 animate-pulse h-full p-6 text-center">
           <div className="w-16 h-16 bg-gold rounded-full mb-6 flex items-center justify-center">
             <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
           </div>
           <p className="text-dark font-bold text-lg mb-2">{isCapturing ? "AI Watching..." : "Chef is working..."}</p>
           <p className="text-xs text-midGrey">{loadingStage}</p>
           {isCapturing && (
               <div className="mt-8 bg-red-50 text-red-500 border border-red-200 px-4 py-2 rounded-full flex items-center gap-2 animate-bounce">
                   <div className="w-3 h-3 bg-red-500 rounded-full" />
                   <span className="text-xs font-bold uppercase">Recording Screen</span>
               </div>
           )}
        </div>
      );
  }

  // --- UI: Selection Grid (Step 2 of Image) ---
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

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-secondary p-1 rounded-xl">
          <button onClick={() => setActiveMode('scan')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${activeMode === 'scan' ? 'bg-white shadow-sm text-dark' : 'text-midGrey'}`}>Photo Scan</button>
          <button onClick={() => setActiveMode('smart_link')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${activeMode === 'smart_link' ? 'bg-white shadow-sm text-dark' : 'text-midGrey'}`}>Smart Link</button>
      </div>

      <div className="space-y-6">

          {/* PHOTO MODE */}
          {activeMode === 'scan' && (
             <div 
                onClick={() => fileInputRef.current?.click()}
                className="bg-secondary p-8 rounded-xl flex flex-col items-center justify-center gap-4 cursor-pointer active:scale-[0.98] transition-transform border-2 border-dashed border-gray-300 hover:border-gold"
            >
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-gold shadow-sm">
                    <Camera size={32} />
                </div>
                <div className="text-center">
                    <h3 className="font-bold text-dark text-lg">Scan Ingredients</h3>
                    <p className="text-xs text-midGrey mt-1">Take a photo of food to get recipes</p>
                </div>
                <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
             </div>
          )}

          {/* SMART LINK MODE */}
          {activeMode === 'smart_link' && (
              <div className="space-y-4">
                  
                  {/* Link Input Section */}
                  <div className="bg-white border border-secondary p-6 rounded-xl shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                            <LinkIcon size={18} className="text-gold" />
                            <h3 className="font-bold text-dark">Paste URL</h3>
                        </div>
                        <input
                            className="w-full bg-secondary p-4 rounded-lg text-sm text-dark focus:outline-none focus:ring-2 focus:ring-gold/50 mb-4"
                            placeholder="https://youtube.com/watch?v=..."
                            value={inputText}
                            onChange={(e) => {
                                setInputText(e.target.value);
                                setVideoUrl(e.target.value); // Sync for video embed
                                setEmbedHtml(null); // Reset embed when typing
                            }}
                        />
                        <div className="flex gap-2">
                             <button 
                                onClick={handleTextSubmit}
                                disabled={!inputText}
                                className="flex-1 py-3 bg-secondary text-dark rounded-xl font-bold text-xs"
                             >
                                Extract Text
                             </button>
                             <button 
                                onClick={loadVideo}
                                disabled={!inputText}
                                className="flex-1 py-3 bg-dark text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2"
                             >
                                <Play size={12} fill="currentColor" /> Load Video
                             </button>
                        </div>
                  </div>

                  {/* Video Player & AI Eyes Section */}
                  {embedHtml && (
                      <div className="bg-black rounded-xl overflow-hidden shadow-lg animate-fade-in">
                          <iframe 
                            width="100%" 
                            height="240" 
                            src={embedHtml} 
                            title="Video player" 
                            frameBorder="0" 
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                            allowFullScreen
                          ></iframe>
                          
                          <div className="p-4 bg-dark text-white">
                              <h4 className="font-bold text-sm mb-2 flex items-center gap-2">
                                  <MonitorPlay size={16} className="text-gold" /> AI Video Analysis
                              </h4>
                              <p className="text-[10px] text-gray-400 mb-4">
                                  Press "Start AI Eyes", select this window, then play the video. The AI will watch and extract the recipe from visuals.
                              </p>
                              <button 
                                onClick={startScreenCapture}
                                className="w-full bg-gold text-white py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#B89240] transition-colors"
                              >
                                  <Eye size={18} /> Start AI Eyes
                              </button>
                          </div>
                      </div>
                  )}

                  {!embedHtml && inputText && (
                       <div className="text-center p-4">
                           <p className="text-xs text-midGrey">Load the video to enable AI Visual Analysis.</p>
                       </div>
                  )}

              </div>
          )}

          <div 
            onClick={() => setShowManual(true)}
            className="flex items-center justify-center gap-2 p-4 text-midGrey hover:text-dark transition-colors cursor-pointer"
          >
            <Edit3 size={16} />
            <span className="text-xs font-bold">Or create manually</span>
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
    const [showMusicHistory, setShowMusicHistory] = useState(false);

    const handleSaveProfile = () => {
        onUpdateProfile({
            ...userProfile,
            dietaryPreferences: dietary.split(',').map(s => s.trim()).filter(s => s),
            allergies: allergies.split(',').map(s => s.trim()).filter(s => s)
        });
        setEditMode(false);
    };

    const handleShareMusic = () => {
        if (!userProfile.musicHistory || userProfile.musicHistory.length === 0) return;
        
        const text = "🎵 My Kitchen Jams from Just Cook Bro:\n" + 
                     userProfile.musicHistory.slice(0, 5).map(t => `- ${t.name} by ${t.artist}`).join('\n') +
                     "\n...and more!";
        
        if (navigator.share) {
            navigator.share({ title: 'My Cooking Playlist', text }).catch(console.error);
        } else {
            navigator.clipboard.writeText(text);
            alert("Playlist copied to clipboard!");
        }
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

            {/* Music History Section */}
            <div className="bg-white border border-secondary rounded-xl p-4 mb-6">
                 <div className="flex justify-between items-center mb-2" onClick={() => setShowMusicHistory(!showMusicHistory)}>
                     <div className="flex items-center gap-2">
                         <Music size={18} className="text-[#1DB954]" />
                         <h3 className="font-bold text-sm">Music Logs</h3>
                     </div>
                     <button className="text-xs text-midGrey font-bold">
                        {showMusicHistory ? "Hide" : "View"}
                     </button>
                 </div>
                 
                 {showMusicHistory && (
                     <div className="mt-3 animate-fade-in">
                         {(!userProfile.musicHistory || userProfile.musicHistory.length === 0) ? (
                             <p className="text-xs text-midGrey italic">No music logged yet. Connect Spotify while cooking!</p>
                         ) : (
                             <>
                                <div className="max-h-40 overflow-y-auto space-y-2 mb-3">
                                    {userProfile.musicHistory.slice().reverse().map((track, idx) => (
                                        <div key={idx} className="flex items-center gap-3 bg-secondary/30 p-2 rounded-lg">
                                            {track.albumArt ? <img src={track.albumArt} className="w-8 h-8 rounded" alt="" /> : <div className="w-8 h-8 bg-gray-200 rounded"/>}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold truncate">{track.name}</p>
                                                <p className="text-[10px] text-midGrey truncate">{track.artist}</p>
                                            </div>
                                            <span className="text-[8px] text-gray-400">{new Date(track.playedAt).toLocaleDateString()}</span>
                                        </div>
                                    ))}
                                </div>
                                <button onClick={handleShareMusic} className="w-full py-2 bg-[#1DB954]/10 text-[#1DB954] rounded-lg text-xs font-bold flex items-center justify-center gap-2">
                                    <Share2 size={12} /> Share Logs
                                </button>
                             </>
                         )}
                     </div>
                 )}
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
    onToggleOffline: (recipeId: string) => void,
    onAssignCollection: (recipeId: string, collection: string) => void
}> = ({ recipes, userProfile, setShowPaywall, onAddReview, onToggleOffline, onAssignCollection }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const recipe = recipes.find(r => r.id === id);
  const [nearbyStores, setNearbyStores] = useState<{ [key: string]: StoreLocation[] }>({});
  const [loadingStores, setLoadingStores] = useState<{ [key: string]: boolean }>({});
  const [showCollections, setShowCollections] = useState(false);

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

  // Collection Assignment Handler
  const handleCollectionClick = () => {
      if (!userProfile.isPremium) {
          setShowPaywall(true);
      } else {
          if (!userProfile.customCollections || userProfile.customCollections.length === 0) {
              alert("Go to Home to create a collection first!");
          } else {
              setShowCollections(!showCollections);
          }
      }
  };

  const toggleCollection = (collection: string) => {
      onAssignCollection(recipe.id, collection);
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
                     <button onClick={handleCollectionClick} className="bg-white/20 p-2 rounded-full text-white hover:bg-white/30 relative">
                         <FolderPlus size={18} />
                         {!userProfile.isPremium && <div className="absolute top-0 right-0 w-2 h-2 bg-gold rounded-full border border-black"></div>}
                     </button>
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
        {/* Collection Dropdown Area */}
        {showCollections && userProfile.isPremium && (
            <div className="mb-6 bg-secondary p-4 rounded-xl animate-fade-in border border-gold/30">
                <h4 className="font-bold text-sm mb-3 flex items-center gap-2"><Folder size={14} className="text-gold"/> Add to Category</h4>
                <div className="flex flex-wrap gap-2">
                    {userProfile.customCollections?.map(col => {
                        const isSelected = recipe.userCollections?.includes(col);
                        return (
                            <button 
                                key={col} 
                                onClick={() => toggleCollection(col)}
                                className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${isSelected ? 'bg-gold text-white shadow-md' : 'bg-white text-midGrey border border-gray-200'}`}
                            >
                                {col} {isSelected && "✓"}
                            </button>
                        );
                    })}
                </div>
            </div>
        )}

        {/* Attribution & Credit Box */}
        {(recipe.originalAuthor || recipe.originalSource) && (
             <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl mb-6 flex items-start gap-3">
                 <Info size={20} className="text-blue-500 shrink-0 mt-0.5" />
                 <div>
                     <h4 className="font-bold text-sm text-blue-900 mb-1">Recipe Credits</h4>
                     <p className="text-xs text-blue-800">
                         Original by <span className="font-bold">{recipe.originalAuthor || "Unknown Creator"}</span>
                         {recipe.originalSource && <span> on {recipe.originalSource}</span>}.
                     </p>
                     {recipe.socialHandle && (
                         <p className="text-xs text-blue-600 font-bold mt-1">{recipe.socialHandle}</p>
                     )}
                 </div>
             </div>
        )}

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
      musicHistory: [], // Init empty history
      customCollections: [] // Init empty collections
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
    // Limit Check - STRICT 20 for Free Users
    if (!userProfile.isPremium && recipes.length >= 20) {
        alert("Cookbook Full! Free users can only save 20 recipes. Upgrade to save more.");
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

  // Social Interaction Handler
  const handleSaveCommunityRecipe = async (recipe: Recipe) => {
     // Check limit via addRecipe logic (simplified)
      if (!userProfile.isPremium && recipes.length >= 20) {
          alert("Cookbook Full! Upgrade to Pro to save more recipes.");
          setShowPaywall(true);
          return;
      }

      const newRecipe = await storageService.saveCommunityRecipe(recipe, user?.id);
      addRecipe(newRecipe);
      alert("Recipe unlocked and saved to your cookbook!");
  };
  
  // Share Handler (From Cooking Mode)
  const handleShareToFeed = async (recipe: Recipe, track?: SpotifyTrack) => {
      // Mark as public and attach music metadata
      const feedRecipe: Recipe = {
          ...recipe,
          isPublic: true,
          sharedMusicTrack: track
      };
      // We don't save this to the local 'recipes' list again, 
      // but strictly we should send it to the 'public' database.
      // Since we mock the backend, let's just update the existing local recipe to be public
      // so it hypothetically syncs.
      
      const updated = recipes.map(r => r.id === recipe.id ? feedRecipe : r);
      setRecipes(updated);
      storageService.saveRecipes(updated, user?.id);
      
      // Also send to mock "Community" DB
      await storageService.saveCommunityRecipe(feedRecipe);
  };

  // --- Collection Handlers ---
  const createCollection = (name: string) => {
      const current = userProfile.customCollections || [];
      if(current.includes(name)) return;
      const updatedProfile = { ...userProfile, customCollections: [...current, name] };
      updateProfile(updatedProfile);
  };
  
  const deleteCollection = (name: string) => {
      if (!userProfile.isPremium) return;
      const current = userProfile.customCollections || [];
      const updatedProfile = { ...userProfile, customCollections: current.filter(c => c !== name) };
      updateProfile(updatedProfile);
  };

  const assignRecipeToCollection = (recipeId: string, collection: string) => {
      const target = recipes.find(r => r.id === recipeId);
      if(!target) return;
      
      const currentCollections = target.userCollections || [];
      let newCollections: string[];

      if(currentCollections.includes(collection)) {
          // Remove
          newCollections = currentCollections.filter(c => c !== collection);
      } else {
          // Add
          newCollections = [...currentCollections, collection];
      }
      
      const updatedRecipes = recipes.map(r => r.id === recipeId ? { ...r, userCollections: newCollections } : r);
      setRecipes(updatedRecipes);
      storageService.saveRecipes(updatedRecipes, user?.id);
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
        <Route path="/" element={<Layout><HomeScreen 
            recipes={recipes} 
            onDelete={deleteRecipe} 
            userProfile={userProfile} 
            onCreateCollection={createCollection}
            onDeleteCollection={deleteCollection}
            setShowPaywall={setShowPaywall}
        /></Layout>} />
        <Route path="/discover" element={<Layout><DiscoverScreen onAddRecipe={addRecipe} userProfile={userProfile} /></Layout>} />
        <Route path="/community" element={<Layout><CommunityScreen onSaveRecipe={handleSaveCommunityRecipe} /></Layout>} />
        <Route path="/notifications" element={<Layout><NotificationsScreen /></Layout>} />
        <Route path="/profile" element={<Layout><ProfileScreen userProfile={userProfile} setPremium={(val) => updateProfile({...userProfile, isPremium: val})} onUpdateProfile={updateProfile} onLogout={handleLogout} /></Layout>} />
        <Route path="/recipe/:id" element={<Layout>
            <RecipeDetailScreen 
                recipes={recipes} 
                userProfile={userProfile} 
                setShowPaywall={setShowPaywall} 
                onAddReview={addReview}
                onToggleOffline={toggleOffline}
                onAssignCollection={assignRecipeToCollection}
            />
        </Layout>} />
        <Route path="/cook/:id" element={<CookingMode recipes={recipes} onAddMusicToHistory={addMusicToHistory} onShareToFeed={handleShareToFeed} />} />
      </Routes>
      
      {showPaywall && (
        <Paywall onClose={() => setShowPaywall(false)} onSuccess={() => { updateProfile({...userProfile, isPremium: true}); setShowPaywall(false); }} />
      )}
    </MemoryRouter>
  );
};

export default App;