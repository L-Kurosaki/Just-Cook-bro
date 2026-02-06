import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, SafeAreaView, Alert, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';

import { Recipe, UserProfile, SpotifyTrack } from './types';
import { extractRecipeFromUrl, suggestRecipesFromImage, generateFullRecipeFromSuggestion } from './services/geminiService';
import { storageService } from './services/storageService';
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

import { Camera, Link as LinkIcon, Home, Globe, Search, Bell, ShoppingCart } from 'lucide-react-native';
import { ScrollView, Text, TouchableOpacity, TextInput } from 'react-native';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// --- COMPONENTS ---

const HomeScreen = ({ navigation }: any) => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    const loadData = async () => {
        // Get current user ID for fetching
        const { data: { user } } = await supabase.auth.getUser();
        const prof = await storageService.getProfile(user?.id);
        setUserProfile(prof);
        const data = await storageService.getRecipes(user?.id);
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
                <Text className="text-2xl font-bold text-dark">Hey {userProfile?.name?.split(' ')[0] || 'Chef'},</Text>
                <Text className="text-midGrey">You have {recipes.length} recipes saved.</Text>
            </View>
            <View className="flex-row gap-3">
                <TouchableOpacity onPress={() => navigation.navigate('ShoppingList')}>
                    <ShoppingCart size={24} stroke="#2E2E2E" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
                    <Bell size={24} stroke="#2E2E2E" />
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
  const [statusMessage, setStatusMessage] = useState("");

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true, // Only guaranteed on Native
      quality: 0.5,
    });

    if (!result.canceled) {
      setLoading(true);
      setStatusMessage("Analyzing Food...");
      
      try {
          // On Web, ImagePicker often returns a blob URI, not base64. We must convert it.
          let base64Data = result.assets[0].base64;
          
          if (!base64Data && Platform.OS === 'web') {
              const response = await fetch(result.assets[0].uri);
              const blob = await response.blob();
              base64Data = await new Promise((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onloadend = () => {
                      const base64String = reader.result as string;
                      // Remove data url prefix (e.g. "data:image/jpeg;base64,")
                      resolve(base64String.split(',')[1]); 
                  };
                  reader.onerror = reject;
                  reader.readAsDataURL(blob);
              });
          }

          if (base64Data) {
              const suggestions = await suggestRecipesFromImage(base64Data);
              if(suggestions.length > 0) {
                  setStatusMessage("Writing Recipe...");
                  const recipe = await generateFullRecipeFromSuggestion(suggestions[0], base64Data);
                  
                  const { data: { user } } = await supabase.auth.getUser();
                  await storageService.addRecipe(recipe, user?.id);
                  
                  setLoading(false);
                  navigation.navigate('Home');
              } else {
                  throw new Error("No recipes found in image.");
              }
          }
      } catch (e: any) {
          Alert.alert("Scan Failed", e.message || "Could not analyze image. Try a clearer photo.");
          setLoading(false);
      }
    }
  };

  const handleLink = async () => {
      if (!inputText.trim()) return;
      setLoading(true);
      setStatusMessage("Reading Website...");
      try {
          const recipe = await extractRecipeFromUrl(inputText);
          const { data: { user } } = await supabase.auth.getUser();
          await storageService.addRecipe(recipe, user?.id);
          
          setLoading(false);
          navigation.navigate('Home');
      } catch(e: any) {
          console.error(e);
          Alert.alert("Import Failed", "Could not extract recipe. This might be due to the website blocking access. Try pasting the text directly if possible.");
          setLoading(false);
      }
  };

  if (loading) return <View className="flex-1 justify-center items-center gap-4"><ActivityIndicator size="large" color="#C9A24D" /><Text className="text-dark font-bold text-lg">{statusMessage || "Chef is working..."}</Text></View>;

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
              <Camera size={40} stroke="#C9A24D" />
              <Text className="font-bold text-dark mt-4">Pick from Gallery</Text>
          </TouchableOpacity>
      ) : (
          <View className="bg-secondary p-6 rounded-xl">
               <View className="flex-row items-center gap-2 mb-4">
                   <LinkIcon size={20} stroke="#C9A24D" />
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
        <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarIcon: ({color}) => <Home stroke={color} size={24} /> }} />
        <Tab.Screen name="Discover" component={DiscoverScreen} options={{ tabBarIcon: ({color}) => <Search stroke={color} size={24} /> }} />
        <Tab.Screen name="Community" component={CommunityScreen} options={{ tabBarIcon: ({color}) => <Globe stroke={color} size={24} /> }} />
        <Tab.Screen name="Profile">
             {(props) => {
                 const [profile, setProfile] = useState<UserProfile>({name: "Chef", isPremium: false, dietaryPreferences: [], allergies: [], isDeleteLocked: false, musicHistory: []});
                 
                 useEffect(() => { 
                    supabase.auth.getUser().then(({data}) => {
                        if(data.user) {
                            storageService.getProfile(data.user.id).then(p => p && setProfile(p));
                        }
                    });
                 }, []);
                 
                 return (
                     <ProfileScreen 
                        userProfile={profile} 
                        setPremium={(v) => { 
                            const p = {...profile, isPremium: v}; 
                            setProfile(p); 
                            supabase.auth.getUser().then(({data}) => {
                                if(data.user) storageService.saveProfile(p, data.user.id);
                            });
                        }} 
                        onUpdateProfile={(p) => { 
                            setProfile(p); 
                            supabase.auth.getUser().then(({data}) => {
                                if(data.user) storageService.saveProfile(p, data.user.id);
                            });
                        }} 
                        onLogout={onLogout} 
                     />
                 );
             }}
        </Tab.Screen>
    </Tab.Navigator>
);

const App = () => {
  const [session, setSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Global Data State
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile>({name: "Chef", isPremium: false, dietaryPreferences: [], allergies: [], isDeleteLocked: false, musicHistory: []});

  useEffect(() => {
    // 1. Fetch initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
          fetchUserData(session.user.id);
      }
      setIsLoading(false);
    });

    // 2. Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
          fetchUserData(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserData = async (userId: string) => {
      const r = await storageService.getRecipes(userId);
      setRecipes(r);
      const p = await storageService.getProfile(userId);
      if (p) setUserProfile(p);
  };

  const handleLogout = async () => {
      const { error } = await supabase.auth.signOut();
      if (error) {
          Alert.alert("Error signing out", error.message);
      } else {
          // Session state updates automatically via onAuthStateChange
          setUserProfile({name: "Chef", isPremium: false, dietaryPreferences: [], allergies: [], isDeleteLocked: false, musicHistory: []});
          setRecipes([]);
      }
  };

  // Actions
  const handleAddReview = (id: string, rating: number, comment: string) => {
      const target = recipes.find(r => r.id === id);
      if (target) {
          const newRecipe = { ...target, reviews: [...(target.reviews || []), { id: Date.now().toString(), userId: 'me', userName: userProfile.name, rating, comment, date: new Date().toISOString() }] };
          storageService.updateRecipe(newRecipe, session?.user.id);
          // Optimistic update
          setRecipes(prev => prev.map(r => r.id === id ? newRecipe : r));
      }
  };

  const handleSaveRecipe = async (recipe: Recipe) => {
     const newRecipe = await storageService.saveCommunityRecipe(recipe);
     await storageService.addRecipe(newRecipe, session?.user.id);
     const r = await storageService.getRecipes(session?.user.id);
     setRecipes(r);
  };

  if (isLoading) return <View className="flex-1 justify-center items-center"><ActivityIndicator color="#C9A24D" /></View>;

  return (
    <NavigationContainer>
        <Stack.Navigator id="RootStack" screenOptions={{ headerShown: false }}>
            {!session && isSupabaseConfigured() ? (
                <Stack.Screen name="Auth">
                    {props => <Auth {...props} onAuthSuccess={() => { /* Handled by auth listener */ }} />}
                </Stack.Screen>
            ) : (
                <>
                    <Stack.Screen name="Main">
                        {props => <TabNavigator {...props} onLogout={handleLogout} />}
                    </Stack.Screen>
                    
                    <Stack.Screen name="RecipeDetail">
                        {props => <RecipeDetailScreen 
                            {...props} 
                            recipes={recipes} 
                            userProfile={userProfile} 
                            onAddReview={handleAddReview}
                            onToggleOffline={(id) => { 
                                const r = recipes.find(x => x.id === id); 
                                if(r) {
                                    const updated = {...r, isOffline: !r.isOffline};
                                    storageService.updateRecipe(updated, session?.user.id);
                                    setRecipes(prev => prev.map(item => item.id === id ? updated : item));
                                }
                            }}
                            onAssignCollection={(id, col) => { 
                                const r = recipes.find(x => x.id === id); 
                                if(r) {
                                    const cols = r.userCollections || [];
                                    const newCols = cols.includes(col) ? cols.filter(c => c !== col) : [...cols, col];
                                    const updated = {...r, userCollections: newCols};
                                    storageService.updateRecipe(updated, session?.user.id);
                                    setRecipes(prev => prev.map(item => item.id === id ? updated : item));
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
                            onAddMusicToHistory={(t) => {
                                const updatedProfile = {...userProfile, musicHistory: [...(userProfile.musicHistory || []), t]};
                                setUserProfile(updatedProfile);
                                storageService.saveProfile(updatedProfile, session?.user.id);
                            }}
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