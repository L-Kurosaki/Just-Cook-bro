import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TextInput, ActivityIndicator, SafeAreaView, TouchableOpacity } from 'react-native';
import { storageService } from '../services/storageService';
import { Recipe, UserProfile } from '../types';
import RecipeCard from './RecipeCard';
import { Search, Flame } from 'lucide-react-native';

const CommunityScreen = () => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const data = await storageService.getPublicRecipes();
    const prof = await storageService.getProfile();
    setRecipes(data);
    setProfile(prof);
    setLoading(false);
  };

  const filteredRecipes = recipes.filter(r => 
    r.title.toLowerCase().includes(searchText.toLowerCase()) || 
    r.description?.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
       <View className="p-6">
           <Text className="text-2xl font-bold text-dark mb-4">Community Feed</Text>
           
           <View className="flex-row items-center bg-secondary rounded-xl px-4 py-3 mb-6">
               <Search size={20} color="#6B6B6B" />
               <TextInput 
                  className="flex-1 ml-3 text-dark font-medium"
                  placeholder="What's cooking, good looking?"
                  value={searchText}
                  onChangeText={setSearchText}
                  returnKeyType="search"
               />
           </View>

           <View className="flex-row items-center gap-2 mb-4">
               <Flame size={16} color="#C9A24D" />
               <Text className="font-bold text-dark text-sm uppercase tracking-widest">Trending Now</Text>
           </View>

           {loading ? (
               <View className="mt-10 items-center">
                   <ActivityIndicator size="large" color="#C9A24D" />
               </View>
           ) : (
               <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                   {filteredRecipes.length === 0 ? (
                       <Text className="text-center text-midGrey mt-10">No recipes found. Be the first to share!</Text>
                   ) : (
                       filteredRecipes.map((r, i) => (
                           <RecipeCard key={i} recipe={r} userProfile={profile} />
                       ))
                   )}
               </ScrollView>
           )}
       </View>
    </SafeAreaView>
  );
};

export default CommunityScreen;