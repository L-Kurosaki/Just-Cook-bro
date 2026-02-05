import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Image, Alert, SafeAreaView, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';

import { Recipe, UserProfile, SpotifyTrack, Review } from './types';
import { parseRecipeFromText, extractRecipeFromUrl, suggestRecipesFromImage, generateFullRecipeFromSuggestion } from './services/geminiService';
import { storageService } from './services/storageService';
import { purchases, REVENUE_CAT_API_KEY } from './services/revenueCatService';
import { supabase, isSupabaseConfigured } from './services/supabaseClient';

// Components
import RecipeCard from './components/RecipeCard';
import Auth from './components/Auth';
import RecipeDetailScreen from './components/RecipeDetailScreen';
import CookingMode from './components/CookingMode';
import NotificationsScreen from './components/NotificationsScreen';
import ProfileScreen from './components/ProfileScreen';
import CommunityScreen from './components/CommunityScreen';
import ShoppingListScreen from './components/ShoppingListScreen';

import { Camera, Link as LinkIcon, Plus, MapPin, Home, User, Globe, Search, ArrowLeft, Trash2, Filter, Bell, ShoppingCart } from 'lucide-react-native';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// --- SHARED STATE ---
// In a real app, use Context API or Redux. For this file structure, we pass props or rely on storageService re-fetching.

const HomeScreen = ({ navigation }: any) => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    const loadData = async () => {
        const prof = await storageService.getProfile();
        setUserProfile(prof);
        const data = await storageService.getRecipes();
        setRecipes(data);
    };
    const unsubscribe = navigation.addListener('focus', loadData);
    return unsubscribe;
  }, [navigation]);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="p-6">
        <View className="mb-6 flex-row justify-between items-start">
            <View>
                <Text className="text-2xl font-bold text-dark">Hey {userProfile?.name || 'Chef'},</Text>
                <Text className="text-midGrey">You have {recipes.length} recipes saved.</Text>
            </View>
            <View className="flex-row gap-3">
                <TouchableOpacity onPress={() => navigation.navigate('ShoppingList')}>
                    <ShoppingCart size={24} color="#2E2E2E" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
                    <Bell size={24} color="#2E2E2E" />
                </TouchableOpacity>
            </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4 flex-row">
            <TouchableOpacity onPress={() => setActiveFilter('all')} className={`px-4 py-2 rounded-full mr-2 ${activeFilter === 'all' ? 'bg-dark' : 'bg-secondary'}`}>
                <Text className={`font-bold ${activeFilter === 'all' ? 'text-white' : 'text-midGrey'}`}>All</Text>
            </TouchableOpacity>
             <TouchableOpacity onPress={() => setActiveFilter('offline')} className={`px-4 py-2 rounded-full mr-2 ${activeFilter === 'offline' ? 'bg-dark' : 'bg-secondary'}`}>
                <Text className={`font-bold ${activeFilter === 'offline' ? 'text-white' : 'text-midGrey'}`}>Offline</Text>
            </TouchableOpacity>
        </ScrollView>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
            {recipes.length === 0 ? (
                <View className="p-10 bg-secondary rounded-xl items-center">
                    <Text className="text-midGrey">No recipes yet.</Text>
                </View>
            ) : (
                recipes.map(r => (
                    <RecipeCard key={r.id} recipe={r} userProfile={userProfile} />
                ))
            )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const DiscoverScreen = ({ navigation }: any) => {
  const [activeMode, setActiveMode] = useState<'scan' | 'link'>('scan');
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
      quality: 0.5,
    });

    if (!result.canceled && result.assets[0].base64) {
      setLoading(true);
      try {
          const suggestions = await suggestRecipesFromImage(result.assets[0].base64);
          if(suggestions.length > 0) {
              const recipe = await generateFullRecipeFromSuggestion(suggestions[0], result.assets[0].base64);
              await storageService.addRecipe(recipe);
              setLoading(false);
              navigation.navigate('Home');
          }
      } catch (e) {
          Alert.alert("Error", "Could not analyze image");
          setLoading(false);
      }
    }
  };

  const handleLink = async () => {
      setLoading(true);
      try {
          const recipe = await extractRecipeFromUrl(inputText);
          await storageService.addRecipe(recipe);
          setLoading(false);
          navigation.navigate('Home');
      } catch(e) {
          Alert.alert("Error", "Could not extract recipe");
          setLoading(false);
      }
  };

  if (loading) return <View className="flex-1 justify-center items-center"><ActivityIndicator size="large" color="#C9A24D" /><Text className="mt-4 text-dark font-bold">Chef is working...</Text></View>;

  return (
    <SafeAreaView className="flex-1 bg-white p-6">
      <Text className="text-2xl font-bold text-dark mb-6">Add a Recipe</Text>
      
      <View className="flex-row mb-6 bg-secondary p-1 rounded-xl">
          <TouchableOpacity onPress={() => setActiveMode('scan')} className={`flex-1 py-3 items-center rounded-lg ${activeMode === 'scan' ? 'bg-white shadow-sm' : ''}`}>
              <Text className="font-bold text-xs">Photo Scan</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveMode('link')} className={`flex-1 py-3 items-center rounded-lg ${activeMode === 'link' ? 'bg-white shadow-sm' : ''}`}>
               <Text className="font-bold text-xs">Smart Link</Text>
          </TouchableOpacity>
      </View>

      {activeMode === 'scan' ? (
          <TouchableOpacity onPress={pickImage} className="bg-secondary p-10 rounded-xl items-center justify-center border-2 border-dashed border-gray-300">
              <Camera size={40} color="#C9A24D" />
              <Text className="font-bold text-dark mt-4">Pick from Gallery</Text>
          </TouchableOpacity>
      ) : (
          <View className="bg-secondary p-6 rounded-xl">
               <View className="flex-row items-center gap-2 mb-4">
                   <LinkIcon size={20} color="#C9A24D" />
                   <Text className="font-bold text-dark">Paste URL</Text>
               </View>
               <TextInput 
                  className="bg-white p-4 rounded-lg text-dark mb-4"
                  placeholder="https://..."
                  value={inputText}
                  onChangeText={setInputText}
                  autoCapitalize="none"
               />
               <TouchableOpacity onPress={handleLink} className="bg-gold py-3 rounded-xl items-center">
                   <Text className="text-white font-bold">Extract Recipe</Text>
               </TouchableOpacity>
          </View>
      )}
    </SafeAreaView>
  );
};

// --- MAIN NAVIGATOR ---

const TabNavigator = ({ onLogout }: any) => (
    <Tab.Navigator 
        id="MainTabs"
        screenOptions={{ 
            headerShown: false, 
            tabBarStyle: { height: 60, paddingBottom: 5, paddingTop: 5 },
            tabBarActiveTintColor: '#C9A24D',
            tabBarInactiveTintColor: '#6B6B6B'
        }}
    >
        <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarIcon: ({color}) => <Home color={color} size={24} /> }} />
        <Tab.Screen name="Discover" component={DiscoverScreen} options={{ tabBarIcon: ({color}) => <Search color={color} size={24} /> }} />
        <Tab.Screen name="Community" component={CommunityScreen} options={{ tabBarIcon: ({color}) => <Globe color={color} size={24} /> }} />
        <Tab.Screen name="Profile">
             {(props) => {
                 // Fetch profile for profile screen props
                 const [profile, setProfile] = useState<UserProfile>({name: "Chef", isPremium: false, dietaryPreferences: [], allergies: [], isDeleteLocked: false, musicHistory: []});
                 useEffect(() => { storageService.getProfile().then(p => p && setProfile(p)) }, []);
                 
                 return (
                     <ProfileScreen 
                        userProfile={profile} 
                        setPremium={(v) => { const p = {...profile, isPremium: v}; setProfile(p); storageService.saveProfile(p); }} 
                        onUpdateProfile={(p) => { setProfile(p); storageService.saveProfile(p); }} 
                        onLogout={onLogout} 
                     />
                 );
             }}
        </Tab.Screen>
    </Tab.Navigator>
);

const App = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Global State Wrappers for Detail Screens (Simplified for single file)
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile>({name: "Chef", isPremium: false, dietaryPreferences: [], allergies: [], isDeleteLocked: false, musicHistory: []});

  useEffect(() => {
      const load = async () => {
          const r = await storageService.getRecipes();
          setRecipes(r);
          const p = await storageService.getProfile();
          if (p) setUserProfile(p);
      };
      load();
      // Polling for simplistic sync in this structure
      const i = setInterval(load, 2000);
      return () => clearInterval(i);
  }, []);

  useEffect(() => {
    const checkUser = async () => {
        if (isSupabaseConfigured()) {
            const auth = supabase.auth as any;
            try {
                // Handling potential Supabase v1 vs v2 type/runtime mismatch
                if (auth.getSession) {
                    const { data } = await auth.getSession();
                    setUser(data.session?.user || null);
                } else if (auth.session) {
                    const session = auth.session();
                    setUser(session?.user || null);
                }
            } catch (e) {
                console.log('Auth check failed', e);
            }
        }
        setLoading(false);
    };
    checkUser();
  }, []);

  // Actions
  const handleAddReview = (id: string, rating: number, comment: string) => {
      const target = recipes.find(r => r.id === id);
      if (target) {
          const newRecipe = { ...target, reviews: [...(target.reviews || []), { id: Date.now().toString(), userId: 'me', userName: userProfile.name, rating, comment, date: new Date().toISOString() }] };
          storageService.updateRecipe(newRecipe);
      }
  };

  const handleSaveRecipe = async (recipe: Recipe) => {
     // Save a copy of the community recipe to local storage
     const newRecipe = await storageService.saveCommunityRecipe(recipe);
     await storageService.addRecipe(newRecipe);
     // Refresh state
     const r = await storageService.getRecipes();
     setRecipes(r);
  };

  if (loading) return <View className="flex-1 justify-center items-center"><ActivityIndicator color="#C9A24D" /></View>;

  return (
    <NavigationContainer>
        <Stack.Navigator id="RootStack" screenOptions={{ headerShown: false }}>
            {!user && isSupabaseConfigured() ? (
                <Stack.Screen name="Auth">
                    {props => <Auth {...props} onAuthSuccess={setUser} />}
                </Stack.Screen>
            ) : (
                <>
                    <Stack.Screen name="Main">
                        {props => <TabNavigator {...props} onLogout={() => setUser(null)} />}
                    </Stack.Screen>
                    
                    <Stack.Screen name="RecipeDetail">
                        {props => <RecipeDetailScreen 
                            {...props} 
                            recipes={recipes} 
                            userProfile={userProfile} 
                            onAddReview={handleAddReview}
                            onToggleOffline={(id) => { const r = recipes.find(x => x.id === id); if(r) storageService.updateRecipe({...r, isOffline: !r.isOffline}) }}
                            onAssignCollection={(id, col) => { 
                                const r = recipes.find(x => x.id === id); 
                                if(r) {
                                    const cols = r.userCollections || [];
                                    const newCols = cols.includes(col) ? cols.filter(c => c !== col) : [...cols, col];
                                    storageService.updateRecipe({...r, userCollections: newCols});
                                }
                            }}
                            onSaveRecipe={handleSaveRecipe}
                            setShowPaywall={() => Alert.alert("Premium Feature")}
                        />}
                    </Stack.Screen>
                    
                    <Stack.Screen name="Cook">
                        {props => <CookingMode 
                            {...props} 
                            recipes={recipes} 
                            onAddMusicToHistory={(t) => storageService.saveProfile({...userProfile, musicHistory: [...(userProfile.musicHistory || []), t]})}
                            onShareToFeed={() => Alert.alert("Shared!")} 
                        />}
                    </Stack.Screen>

                    <Stack.Screen name="Notifications" component={NotificationsScreen} />
                    <Stack.Screen name="ShoppingList" component={ShoppingListScreen} />
                </>
            )}
        </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;