import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Star, Send } from 'lucide-react-native';
import { Review } from '../types';

interface ReviewSectionProps {
  reviews: Review[];
  onAddReview: (rating: number, comment: string) => void;
  canReview: boolean;
}

const ReviewSection: React.FC<ReviewSectionProps> = ({ reviews, onAddReview, canReview }) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  const handleSubmit = () => {
    if (rating > 0 && comment.trim()) {
      onAddReview(rating, comment);
      setComment("");
      setRating(0);
    }
  };

  return (
    <View className="mt-8 pt-6 border-t border-secondary">
      <Text className="font-bold text-lg mb-4 text-dark">Community Feedback ({reviews.length})</Text>
      
      {/* List */}
      <View className="mb-6">
        {reviews.length === 0 && <Text className="text-sm text-midGrey italic">No reviews yet. Be the first!</Text>}
        {reviews.map((r) => (
          <View key={r.id} className="bg-secondary p-4 rounded-xl mb-3">
             <View className="flex-row justify-between items-start mb-2">
               <Text className="font-bold text-xs text-dark">{r.userName}</Text>
               <View className="flex-row">
                 {[...Array(5)].map((_, i) => (
                    <Star key={i} size={12} stroke="#C9A24D" fill={i < r.rating ? "#C9A24D" : "transparent"} />
                 ))}
               </View>
             </View>
             <Text className="text-sm text-dark">{r.comment}</Text>
          </View>
        ))}
      </View>

      {/* Add Review */}
      {canReview && (
        <View className="bg-white border border-secondary p-4 rounded-xl">
           <Text className="text-xs font-bold mb-2 text-dark">Rate this recipe</Text>
           <View className="flex-row gap-2 mb-3">
             {[1,2,3,4,5].map((s) => (
                <TouchableOpacity key={s} onPress={() => setRating(s)}>
                  <Star size={28} stroke={s <= rating ? "#C9A24D" : "#D1D5DB"} fill={s <= rating ? "#C9A24D" : "transparent"} />
                </TouchableOpacity>
             ))}
           </View>
           <View className="flex-row gap-2 items-center">
             <TextInput 
                value={comment}
                onChangeText={setComment}
                placeholder="Share your experience..."
                className="flex-1 bg-secondary rounded-lg px-3 py-2 text-sm text-dark"
             />
             <TouchableOpacity 
                onPress={handleSubmit} 
                disabled={!rating || !comment} 
                className={`p-3 rounded-lg ${!rating || !comment ? 'bg-gray-300' : 'bg-gold'}`}
             >
               <Send size={16} stroke="white" />
             </TouchableOpacity>
           </View>
        </View>
      )}
    </View>
  );
};

export default ReviewSection;