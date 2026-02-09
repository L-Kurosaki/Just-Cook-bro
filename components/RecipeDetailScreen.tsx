import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, Clock, Users, Heart, MapPin, Download, ChefHat, Folder, Lock, Plus, Globe, AlertTriangle, Crown, Save, ShoppingCart } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Recipe, UserProfile, StoreLocation, Review } from '../types';
import ReviewSection from './ReviewSection';
import { findGroceryStores } from '../services/geminiService';
import { storageService } from '../services/storageService';
import { supabase } from '../services/supabaseClient';

interface RecipeDetailProps {
  recipes: Recipe[];
  userProfile: UserProfile;
  onAddReview: (id: string, rating: number, comment: string) => void;
  onToggleOffline: (id: string) => void;
  onAssignCollection: (id: string, col: string) => void;
  onSaveRecipe: (recipe: Recipe) => void;
  setShowPaywall: (v: boolean) => void;
}

const RecipeDetailScreen: React.FC<RecipeDetailProps> = ({ 
  recipes, 
  userProfile, 
  onAddReview, 
  onToggleOffline, 
  onAssignCollection, 
  onSaveRecipe,
  setShowPaywall 
}) => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  
  const { id, recipeData } = route.params;
  
  const localRecipe = recipes.find(r => r.id === id);
  const recipe = localRecipe || recipeData;
  const isOwned = !!localRecipe;

  const [activeTab, setActiveTab] = useState<'ingredients' | 'steps'>('ingredients');
  const [stores, setStores] = useState<StoreLocation[]>([]);
  const [loadingStores, setLoadingStores] = useState(false);
  
  const [reviews, setReviews] = useState<Review[]>(recipe.reviews || []);
  const [loadingReviews, setLoadingReviews] = useState(false);

  useEffect(() => {
      fetchReviews();
  }, [recipe.id]);

  const fetchReviews = async () => {
      setLoadingReviews(true);
      const data = await storageService.getReviewsForRecipe(recipe.id);
      if (data.length > 0) {
          setReviews(data);
      }
      setLoadingReviews(false);
  };

  const handleAddReviewInternal = async (rating: number, comment: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
          Alert.alert("Please sign in to review");
          return;
      }

      const newReview = {
          userId: user.id,
          userName: userProfile.name || 'Chef',
          rating,
          comment
      };

      await storageService.addReview(recipe.id, newReview);
      
      await fetchReviews();
      Alert.alert("Thanks!", "Your review has been posted.");
  };

  if (!recipe) return <View className="flex-1 justify-center items-center"><Text>Recipe not found</Text></View>;

  const handleLocateStores = async (ingredient: string) => {
     setLoadingStores(true);
     try {
         const results = await findGroceryStores(ingredient, 37.7749, -122.4194); 
         setStores(results);
     } catch(e) {
         Alert.alert("Error", "Could not find stores.");
     } finally {
         setLoadingStores(false);
     }
  };

  const handleStartCooking = () => {
    navigation.navigate('Cook', { id: recipe.id }); 
  };

  const handleSaveToCookbook = () => {
      onSaveRecipe(recipe);
      Alert.alert("Saved!", "Recipe added to your cookbook.");
      navigation.navigate('Home');
  };

  const addToShoppingList = (ingredient: string) => {
     Alert.alert("Shopping List", `${ingredient} added to shopping list!`);
  };

  const hasAllergy = userProfile?.allergies?.some(allergy => 
    recipe.allergens?.map(a => a.toLowerCase()).includes(allergy.toLowerCase()) ||
    recipe.ingredients.some(i => i.name.toLowerCase().includes(allergy.toLowerCase()))
  );

  return (
    <View className="flex-1 bg-white">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
       <View className="h-72 w-full relative">
         <Image source={{ uri: recipe.imageUrl }} className="w-full h-full" resizeMode="cover" />
         <View className="absolute inset-0 bg-black/30" />
         
         {/* Safe Area Back Button */}
         <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            className="absolute left-4 bg-white/20 p-2 rounded-full"
            style={{ top: insets.top + 10 }}
         >
            <ArrowLeft size={24} color="white"/>
         </TouchableOpacity>
         
         <View className="absolute right-4 gap-2 items-end" style={{ top: insets.top + 10 }}>
             {recipe.isPublic && (
                <View className="bg-black/60 px-3 py-1 rounded-full flex-row items-center gap-1">
                    <Globe size={10} color="white" /> 
                    <Text className="text-white text-[10px] font-bold">PUBLIC</Text>
                </View>
             )}
             {recipe.isPremium && (
                <View className="bg-gold px-3 py-1 rounded-full flex-row items-center gap-1">
                    <Crown size={10} color="white" /> 
                    <Text className="text-white text-[10px] font-bold">PRO</Text>
                </View>
             )}
         </View>

         <View className="absolute -bottom-6 left-4 right-4 bg-white rounded-2xl p-5 shadow-xl border border-secondary">
             <View className="flex-row justify-between items-start mb-2">
                 <Text className="text-xl font-bold text-dark flex-1 mr-2">{recipe.title}</Text>
                 {isOwned && (
                     <TouchableOpacity 
                        onPress={() => onToggleOffline(recipe.id)}
                        className={`p-2 rounded-full ${recipe.isOffline ? 'bg-green-100' : 'bg-gray-100'}`}
                     >
                         <Download size={20} color={recipe.isOffline ? "#16A34A" : "#9CA3AF"} />
                     </TouchableOpacity>
                 )}
             </View>
             
             {(recipe.originalAuthor || recipe.author) && (
                 <View className="flex-row items-center gap-2 mb-4">
                    <View className="w-6 h-6 rounded-full bg-gold/10 items-center justify-center">
                        <ChefHat size={14} color="#C9A24D" />
                    </View>
                    <Text className="text-xs text-midGrey">
                        By <Text className="font-bold text-dark">{recipe.originalAuthor || recipe.author}</Text>
                        {recipe.socialHandle && <Text className="text-blue-500"> ({recipe.socialHandle})</Text>}
                    </Text>
                 </View>
             )}

             <View className="flex-row items-center justify-between border-t border-dashed border-gray-100 pt-3">
                 <View className="flex-row items-center gap-4">
                    <View className="flex-row items-center gap-1"><Clock size={14} color="#C9A24D"/><Text className="text-xs text-midGrey">{recipe.prepTime}</Text></View>
                    <View className="flex-row items-center gap-1"><Users size={14} color="#C9A24D"/><Text className="text-xs text-midGrey">{recipe.servings} pp</Text></View>
                 </View>
                 <View className="flex-row items-center gap-1"><Heart size={14} color="#EF4444" fill="#EF4444"/><Text className="text-xs font-bold text-dark">{recipe.rating || 'New'}</Text></View>
             </View>
         </View>
       </View>

       <View className="mt-12 p-6">
           {hasAllergy && (
               <View className="mb-6 bg-red-50 p-4 rounded-xl flex-row gap-3 border border-red-200">
                   <AlertTriangle size={20} color="#DC2626" />
                   <View className="flex-1">
                       <Text className="font-bold text-red-700 text-sm mb-1">ALLERGY WARNING</Text>
                       <Text className="text-xs text-red-600">Ingredients match your allergy profile.</Text>
                   </View>
               </View>
           )}

           <View className="flex-row bg-secondary rounded-xl mb-6 p-1">
               <TouchableOpacity 
                onPress={() => setActiveTab('ingredients')} 
                className={`flex-1 py-3 items-center rounded-lg ${activeTab === 'ingredients' ? 'bg-white shadow-sm' : ''}`}
               >
                <Text className={`text-sm font-bold ${activeTab === 'ingredients' ? 'text-dark' : 'text-midGrey'}`}>Ingredients</Text>
               </TouchableOpacity>
               <TouchableOpacity 
                onPress={() => setActiveTab('steps')} 
                className={`flex-1 py-3 items-center rounded-lg ${activeTab === 'steps' ? 'bg-white shadow-sm' : ''}`}
               >
                <Text className={`text-sm font-bold ${activeTab === 'steps' ? 'text-dark' : 'text-midGrey'}`}>Instructions</Text>
               </TouchableOpacity>
           </View>

           {activeTab === 'ingredients' ? (
               <View className="gap-3">
                   {recipe.ingredients.map((ing, idx) => (
                       <View key={idx} className="flex-row items-center justify-between p-4 bg-white border border-secondary rounded-xl">
                           <View className="flex-row items-center gap-3 flex-1">
                               <View className="w-1.5 h-1.5 rounded-full bg-gold/50" />
                               <Text className="text-sm font-medium text-dark flex-1">{ing.amount} <Text className="text-midGrey">{ing.name}</Text></Text>
                           </View>
                           <View className="flex-row items-center gap-1">
                               <TouchableOpacity onPress={() => addToShoppingList(ing.name)} className="p-2 bg-gray-50 rounded-lg">
                                   <ShoppingCart size={16} color="#6B6B6B" />
                               </TouchableOpacity>
                               <TouchableOpacity onPress={() => handleLocateStores(ing.name)} className="p-2">
                                   <MapPin size={18} color="#D1D5DB"/>
                               </TouchableOpacity>
                           </View>
                       </View>
                   ))}
                   
                   {loadingStores && (
                       <View className="flex-row items-center justify-center gap-2 mt-4">
                           <ActivityIndicator size="small" color="#C9A24D" />
                           <Text className="text-xs text-midGrey">Finding stores...</Text>
                       </View>
                   )}
                   {stores.length > 0 && (
                       <View className="mt-4 bg-gray-50 border border-gray-200 p-4 rounded-xl">
                           <Text className="font-bold text-sm mb-3 text-dark flex-row items-center gap-2"><MapPin size={14} color="#C9A24D" /> Available Nearby</Text>
                           <View className="gap-2">
                               {stores.map((store, i) => (
                                   <View key={i} className="bg-white p-2 rounded-lg border border-gray-100">
                                       <Text className="font-bold text-dark text-xs">{store.name}</Text>
                                       <Text className="text-midGrey text-[10px]">{store.address}</Text>
                                   </View>
                               ))}
                           </View>
                       </View>
                   )}
               </View>
           ) : (
               <View className="gap-6">
                   {recipe.steps.map((step, idx) => (
                       <View key={idx} className="flex-row gap-4">
                           <View className="items-center">
                                <View className="w-8 h-8 rounded-full bg-dark items-center justify-center shadow-lg z-10">
                                    <Text className="text-gold font-bold text-sm">{idx + 1}</Text>
                                </View>
                                {idx < recipe.steps.length - 1 && <View className="w-0.5 flex-1 bg-secondary mt-2 mb-2" />}
                           </View>
                           <View className="flex-1 pb-4">
                               <Text className="text-sm text-dark leading-relaxed font-medium">{step.instruction}</Text>
                               {step.tip && (
                                   <View className="mt-3 bg-blue-50 border border-blue-100 p-3 rounded-lg flex-row gap-2">
                                       <Text className="text-blue-700 text-xs italic flex-1">Tip: {step.tip}</Text>
                                   </View>
                               )}
                           </View>
                       </View>
                   ))}
               </View>
           )}

           <View className="mt-8 pt-6 border-t border-secondary">
               <View className="flex-row justify-between items-center mb-4">
                   <View className="flex-row items-center gap-2">
                       <Folder size={16} color="#2E2E2E" />
                       <Text className="font-bold text-sm text-dark">Collections</Text>
                   </View>
                   {!userProfile.isPremium && (
                       <View className="flex-row items-center gap-1 bg-gray-100 px-2 py-1 rounded-full">
                           <Lock size={10} color="#6B6B6B" /> 
                           <Text className="text-[10px] text-midGrey">Premium</Text>
                       </View>
                   )}
               </View>
               <View className="flex-row flex-wrap gap-2">
                   {userProfile.customCollections?.map(col => (
                       <TouchableOpacity 
                           key={col}
                           onPress={() => isOwned ? onAssignCollection(recipe.id, col) : Alert.alert("Save recipe first!")}
                           className={`px-4 py-1.5 rounded-full border ${isOwned && recipe.userCollections?.includes(col) ? 'bg-gold border-gold' : 'bg-white border-secondary'}`}
                       >
                           <Text className={`text-xs font-bold ${isOwned && recipe.userCollections?.includes(col) ? 'text-white' : 'text-midGrey'}`}>{col}</Text>
                       </TouchableOpacity>
                   ))}
                   <TouchableOpacity 
                    onPress={() => { if(!userProfile.isPremium) setShowPaywall(true); else Alert.alert("Use Home screen to add collections"); }} 
                    className="px-4 py-1.5 rounded-full border border-dashed border-gray-300 flex-row items-center gap-1"
                   >
                       <Plus size={12} color="#9CA3AF" />
                       <Text className="text-xs font-bold text-gray-400">New</Text>
                   </TouchableOpacity>
               </View>
           </View>

           <ReviewSection 
               reviews={reviews} 
               onAddReview={handleAddReviewInternal} 
               canReview={true} // Allow reviewing any recipe now
           />
           <View className="h-20" />
       </View>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-secondary">
           {!isOwned ? (
               <TouchableOpacity 
                  onPress={handleSaveToCookbook}
                  className="w-full bg-gold py-4 rounded-xl flex-row items-center justify-center gap-3 shadow-xl"
               >
                  <Save size={24} color="white" />
                  <Text className="text-white font-bold text-lg">Save to Cookbook</Text>
               </TouchableOpacity>
           ) : (
               <TouchableOpacity 
                   onPress={handleStartCooking}
                   className="w-full bg-dark py-4 rounded-xl flex-row items-center justify-center gap-3 shadow-xl"
               >
                   <ChefHat size={24} color="#C9A24D" />
                   <Text className="text-gold font-bold text-lg">Start Cooking</Text>
               </TouchableOpacity>
           )}
      </View>
    </View>
  );
};

export default RecipeDetailScreen;