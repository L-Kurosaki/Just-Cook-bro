import React from 'react';
import { Clock, Users } from 'lucide-react';
import { Recipe } from '../types';
import { Link } from 'react-router-dom';

interface RecipeCardProps {
  recipe: Recipe;
}

const RecipeCard: React.FC<RecipeCardProps> = ({ recipe }) => {
  return (
    <Link to={`/recipe/${recipe.id}`} className="block">
      <div className="bg-secondary rounded-xl overflow-hidden mb-4 transition-transform active:scale-[0.98]">
        <div className="h-40 w-full bg-gray-300 relative">
          <img 
            src={recipe.imageUrl} 
            alt={recipe.title} 
            className="w-full h-full object-cover"
          />
          {recipe.isPremium && (
            <span className="absolute top-2 right-2 bg-gold text-white text-xs font-bold px-2 py-1 rounded-full">
              Premium
            </span>
          )}
        </div>
        <div className="p-4">
          <h3 className="font-bold text-dark text-lg mb-1">{recipe.title}</h3>
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