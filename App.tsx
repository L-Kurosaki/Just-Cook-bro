import React, { useState } from 'react';
import { HashRouter, Routes, Route, useNavigate, useParams } from 'react-router-dom';
import Layout from './components/Layout';
import RecipeCard from './components/RecipeCard';
import CookingMode from './components/CookingMode';
import { Recipe, StoreLocation } from './types';
import { parseRecipeFromText, scanRecipeFromImage, findGroceryStores } from './services/geminiService';
import { Camera, Link as LinkIcon, Plus, MapPin, CheckCircle, Circle, ArrowRight } from 'lucide-react';

// --- Sub-components for specific pages (kept here for single-file XML structure requirements of key logic) ---

const HomeScreen: React.FC<{ recipes: Recipe[] }> = ({ recipes }) => {
  return (
    <div className="p-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-dark mb-1">Hey Chef,</h2>
        <p className="text-midGrey">Ready to cook something amazing?</p>
      </div>

      <div className="mb-6">
        <h3 className="text-sm font-bold text-dark uppercase tracking-wide mb-3">Your Cookbook</h3>
        {recipes.length === 0 ? (
          <div className="text-center py-10 bg-secondary rounded-xl">
            <p className="text-midGrey text-sm mb-4">No recipes yet.</p>
            <p className="text-gold font-medium">Add your first one below!</p>
          </div>
        ) : (
          recipes.map(r => <RecipeCard key={r.id} recipe={r} />)
        )}
      </div>
    </div>
  );
};

const DiscoverScreen: React.FC<{ onAddRecipe: (r: Recipe) => void }> = ({ onAddRecipe }) => {
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleTextSubmit = async () => {
    if (!inputText.trim()) return;
    setIsLoading(true);
    try {
      const recipe = await parseRecipeFromText(inputText);
      onAddRecipe(recipe);
      navigate(`/recipe/${recipe.id}`);
    } catch (error) {
      alert("Oops! Couldn't understand that recipe. Try giving me more details.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = (reader.result as string).replace("data:", "").replace(/^.+,/, "");
        try {
            const recipe = await scanRecipeFromImage(base64String);
            onAddRecipe(recipe);
            navigate(`/recipe/${recipe.id}`);
        } catch (err) {
            alert("Could not scan image. Ensure it's a clear photo of a recipe.");
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-dark mb-6">Add a Recipe</h2>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 animate-pulse">
           <div className="w-12 h-12 bg-gold rounded-full mb-4"></div>
           <p className="text-midGrey font-medium">Organizing the kitchen chaos...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Scan Option */}
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="bg-secondary p-6 rounded-xl flex items-center justify-between cursor-pointer active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-gold">
                <Camera size={20} />
              </div>
              <div>
                <h3 className="font-bold text-dark">Scan Cookbook</h3>
                <p className="text-xs text-midGrey">Take a photo of a page</p>
              </div>
            </div>
            <ArrowRight size={20} className="text-midGrey" />
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
                className="hidden" 
                accept="image/*"
            />
          </div>

          {/* Text/Link Option */}
          <div className="bg-white border border-secondary p-6 rounded-xl">
            <div className="flex items-center gap-2 mb-4">
                <LinkIcon size={18} className="text-gold" />
                <h3 className="font-bold text-dark">Paste Link or Text</h3>
            </div>
            <textarea
              className="w-full bg-secondary p-3 rounded-lg text-sm text-dark focus:outline-none focus:ring-2 focus:ring-gold/50 min-h-[100px]"
              placeholder="Paste a URL or type your grandma's secret instructions here..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
            <button 
              onClick={handleTextSubmit}
              disabled={!inputText}
              className={`w-full mt-4 py-3 rounded-lg font-bold text-sm transition-colors ${inputText ? 'bg-gold text-white' : 'bg-secondary text-midGrey'}`}
            >
              Convert to Recipe
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const RecipeDetailScreen: React.FC<{ recipes: Recipe[] }> = ({ recipes }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const recipe = recipes.find(r => r.id === id);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<string>>(new Set());
  const [nearbyStores, setNearbyStores] = useState<{ [key: string]: StoreLocation[] }>({});
  const [loadingStores, setLoadingStores] = useState<{ [key: string]: boolean }>({});

  if (!recipe) return <div>Not found</div>;

  const toggleIngredient = (name: string) => {
    const next = new Set(checkedIngredients);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    setCheckedIngredients(next);
  };

  const findStoreForIngredient = async (ingredientName: string) => {
    setLoadingStores(prev => ({ ...prev, [ingredientName]: true }));
    try {
        // Get user location
        navigator.geolocation.getCurrentPosition(async (position) => {
            const stores = await findGroceryStores(ingredientName, position.coords.latitude, position.coords.longitude);
            setNearbyStores(prev => ({ ...prev, [ingredientName]: stores }));
            setLoadingStores(prev => ({ ...prev, [ingredientName]: false }));
        }, (err) => {
            alert("Need location access to find stores.");
            setLoadingStores(prev => ({ ...prev, [ingredientName]: false }));
        });
    } catch (e) {
        console.error(e);
        setLoadingStores(prev => ({ ...prev, [ingredientName]: false }));
    }
  };

  return (
    <div className="pb-20">
      <div className="relative h-64 bg-gray-200">
        <img src={recipe.imageUrl} alt={recipe.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
          <div>
            <span className="bg-gold text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider mb-2 inline-block">
                {recipe.musicMood || "Cooking Vibes"}
            </span>
            <h1 className="text-2xl font-bold text-white">{recipe.title}</h1>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="flex gap-4 mb-8">
          <button 
            onClick={() => navigate(`/cook/${recipe.id}`)}
            className="flex-1 bg-gold text-white font-bold py-3 rounded-xl shadow-lg active:scale-[0.98] transition-transform"
          >
            Start Cooking
          </button>
        </div>

        <div className="mb-8">
          <h3 className="font-bold text-dark mb-4 text-lg">Ingredients</h3>
          <div className="space-y-3">
            {recipe.ingredients.map((ing, idx) => {
                const isChecked = checkedIngredients.has(ing.name);
                const stores = nearbyStores[ing.name];
                const isLoading = loadingStores[ing.name];

                return (
                    <div key={idx} className={`p-3 rounded-lg border transition-colors ${isChecked ? 'bg-secondary border-transparent' : 'bg-white border-secondary'}`}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 cursor-pointer" onClick={() => toggleIngredient(ing.name)}>
                                {isChecked ? <CheckCircle className="text-gold w-5 h-5" /> : <Circle className="text-midGrey w-5 h-5" />}
                                <span className={`${isChecked ? 'text-midGrey line-through' : 'text-dark font-medium'}`}>
                                    {ing.amount} {ing.name}
                                </span>
                            </div>
                            
                            {!isChecked && (
                                <button 
                                    onClick={() => findStoreForIngredient(ing.name)}
                                    className="text-xs text-gold font-medium flex items-center gap-1 px-2 py-1 hover:bg-gold/10 rounded"
                                >
                                    <MapPin size={12} />
                                    {isLoading ? '...' : 'Find'}
                                </button>
                            )}
                        </div>
                        {/* Store suggestions */}
                        {stores && stores.length > 0 && !isChecked && (
                            <div className="mt-2 pl-8 text-xs text-midGrey animate-fade-in">
                                <p>Buy at: <a href={stores[0].uri} target="_blank" rel="noreferrer" className="text-dark underline">{stores[0].name}</a> ({stores[0].address})</p>
                            </div>
                        )}
                    </div>
                );
            })}
          </div>
        </div>

        <div>
            <h3 className="font-bold text-dark mb-4 text-lg">Instructions Preview</h3>
            <ol className="list-decimal pl-4 space-y-2 text-midGrey text-sm">
                {recipe.steps.map((step, i) => (
                    <li key={i}>{step.instruction}</li>
                ))}
            </ol>
        </div>
      </div>
    </div>
  );
};

// --- Main App Component ---

const App: React.FC = () => {
  // Mock initial state
  const [recipes, setRecipes] = useState<Recipe[]>([
    {
      id: '1',
      title: 'Creamy Mushroom Pasta',
      description: 'A quick 15-minute comfort food recipe that feels luxurious.',
      prepTime: '5m',
      cookTime: '10m',
      servings: 2,
      imageUrl: 'https://picsum.photos/id/292/800/600',
      ingredients: [
        { name: 'Pasta', amount: '200g' },
        { name: 'Mushrooms', amount: '1 cup' },
        { name: 'Heavy Cream', amount: '1/2 cup' },
        { name: 'Garlic', amount: '2 cloves' }
      ],
      steps: [
        { instruction: 'Boil salted water and cook pasta until al dente.', timeInSeconds: 600, tip: 'Don\'t forget to save some pasta water!' },
        { instruction: 'Sauté sliced mushrooms and garlic in olive oil.', timeInSeconds: 300 },
        { instruction: 'Add cream and simmer until thickened.', timeInSeconds: 120 },
        { instruction: 'Toss pasta with sauce and serve.', tip: 'Top with parsley if you want to be fancy.' }
      ],
      musicMood: "Italian Dinner Jazz"
    }
  ]);

  const addRecipe = (newRecipe: Recipe) => {
    setRecipes(prev => [newRecipe, ...prev]);
  };

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout><HomeScreen recipes={recipes} /></Layout>} />
        <Route path="/discover" element={<Layout><DiscoverScreen onAddRecipe={addRecipe} /></Layout>} />
        <Route path="/profile" element={<Layout><div className="p-6 text-center text-midGrey">Profile & Settings coming soon!</div></Layout>} />
        <Route path="/recipe/:id" element={<Layout><RecipeDetailScreen recipes={recipes} /></Layout>} />
        {/* Cooking Mode has no layout to maximize focus */}
        <Route path="/cook/:id" element={<CookingMode recipes={recipes} />} />
      </Routes>
    </HashRouter>
  );
};

export default App;