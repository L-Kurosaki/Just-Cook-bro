import React from 'react';
import { Clock, Users, Globe, Lock, AlertTriangle } from 'lucide-react';
import { Recipe, UserProfile } from '../types';
import { Link } from 'react-router-dom';

interface RecipeCardProps {
  recipe: Recipe;
  userProfile?: UserProfile | null;
}

const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, userProfile }) => {
  // Check for allergies
  const hasAllergy = userProfile?.allergies?.some(allergy => 
    recipe.allergens?.map(a => a.toLowerCase()).includes(allergy.toLowerCase()) ||
    recipe.ingredients.some(i => i.name.toLowerCase().includes(allergy.toLowerCase()))
  );

  return (
    <Link to={`/recipe/${recipe.id}`} className="block">
      <div className="bg-secondary rounded-xl overflow-hidden mb-4 transition-transform active:scale-[0.98] border border-transparent hover:border-gold/20 relative">
        <div className="h-40 w-full bg-gray-300 relative">
          <img 
            src={recipe.imageUrl} 
            alt={recipe.title} 
            className="w-full h-full object-cover"
          />
          {recipe.isPremium && (
            <span className="absolute top-2 right-2 bg-dark text-gold text-[10px] font-bold px-2 py-1 rounded-full border border-gold">
              PRO
            </span>
          )}
          {hasAllergy && (
             <span className="absolute bottom-2 right-2 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 animate-pulse">
              <AlertTriangle size={10} /> ALLERGY
            </span>
          )}
        </div>
        <div className="p-4">
          <div className="flex justify-between items-start mb-1">
             <h3 className="font-bold text-dark text-lg leading-tight flex-1">{recipe.title}</h3>
             {recipe.isPublic ? <Globe size={14} className="text-midGrey" /> : <Lock size={14} className="text-midGrey" />}
          </div>
          
          <p className="text-midGrey text-xs line-clamp-2 mb-3">{recipe.description}</p>
          
          <div className="flex items-center gap-4 text-xs text-midGrey font-medium">
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{recipe.prepTime}</span>
            </div>
             <div className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              <span>{recipe.servings} pp</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default RecipeCard;