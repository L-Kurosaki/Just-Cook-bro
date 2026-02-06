import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Clock, Users, Globe, Lock, AlertTriangle } from 'lucide-react-native';
import { Recipe, UserProfile } from '../types';
import { useNavigation } from '@react-navigation/native';

interface RecipeCardProps {
  recipe: Recipe;
  userProfile?: UserProfile | null;
}

const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, userProfile }) => {
  const navigation = useNavigation<any>();

  // Check for allergies
  const hasAllergy = userProfile?.allergies?.some(allergy => 
    recipe.allergens?.map(a => a.toLowerCase()).includes(allergy.toLowerCase()) ||
    recipe.ingredients.some(i => i.name.toLowerCase().includes(allergy.toLowerCase()))
  );

  return (
    <TouchableOpacity 
      onPress={() => navigation.navigate('RecipeDetail', { id: recipe.id, recipeData: recipe })} 
      activeOpacity={0.9}
    >
      <View className="bg-secondary rounded-xl overflow-hidden mb-4 border border-transparent relative">
        <View className="h-40 w-full bg-gray-300 relative">
          <Image 
            source={{ uri: recipe.imageUrl }} 
            className="w-full h-full"
            resizeMode="cover"
          />
          {recipe.isPremium && (
            <View className="absolute top-2 right-2 bg-dark px-2 py-1 rounded-full border border-gold">
              <Text className="text-gold text-[10px] font-bold">PRO</Text>
            </View>
          )}
          {hasAllergy && (
             <View className="absolute bottom-2 right-2 bg-red-600 px-2 py-1 rounded-full flex-row items-center gap-1">
              <AlertTriangle size={10} stroke="white" /> 
              <Text className="text-white text-[10px] font-bold">ALLERGY</Text>
            </View>
          )}
        </View>
        <View className="p-4">
          <View className="flex-row justify-between items-start mb-1">
             <Text className="font-bold text-dark text-lg flex-1 mr-2" numberOfLines={1}>{recipe.title}</Text>
             {recipe.isPublic ? <Globe size={14} stroke="#6B6B6B" /> : <Lock size={14} stroke="#6B6B6B" />}
          </View>
          
          <Text className="text-midGrey text-xs mb-3" numberOfLines={2}>{recipe.description}</Text>
          
          <View className="flex-row items-center gap-4">
            <View className="flex-row items-center gap-1">
              <Clock size={14} stroke="#6B6B6B" />
              <Text className="text-midGrey text-xs font-medium">{recipe.prepTime}</Text>
            </View>
             <View className="flex-row items-center gap-1">
              <Users size={14} stroke="#6B6B6B" />
              <Text className="text-midGrey text-xs font-medium">{recipe.servings} pp</Text>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default RecipeCard;