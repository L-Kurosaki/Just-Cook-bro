import React, { useState } from 'react';
import { Star, Send } from 'lucide-react';
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
    <div className="mt-8 pt-6 border-t border-secondary">
      <h3 className="font-bold text-lg mb-4">Community Feedback ({reviews.length})</h3>
      
      {/* List */}
      <div className="space-y-4 mb-6">
        {reviews.length === 0 && <p className="text-sm text-midGrey italic">No reviews yet. Be the first!</p>}
        {reviews.map((r) => (
          <div key={r.id} className="bg-secondary p-4 rounded-xl">
             <div className="flex justify-between items-start mb-2">
               <span className="font-bold text-xs">{r.userName}</span>
               <div className="flex text-gold">
                 {[...Array(5)].map((_, i) => (
                    <Star key={i} size={10} fill={i < r.rating ? "currentColor" : "none"} />
                 ))}
               </div>
             </div>
             <p className="text-sm text-dark">{r.comment}</p>
          </div>
        ))}
      </div>

      {/* Add Review */}
      {canReview && (
        <div className="bg-white border border-secondary p-4 rounded-xl">
           <p className="text-xs font-bold mb-2">Rate this recipe</p>
           <div className="flex gap-2 mb-3">
             {[1,2,3,4,5].map((s) => (
                <button key={s} onClick={() => setRating(s)}>
                  <Star size={24} className={s <= rating ? "text-gold fill-current" : "text-gray-300"} />
                </button>
             ))}
           </div>
           <div className="flex gap-2">
             <input 
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your experience..."
                className="flex-1 bg-secondary rounded-lg px-3 text-sm focus:outline-none"
             />
             <button onClick={handleSubmit} disabled={!rating || !comment} className="bg-gold text-white p-2 rounded-lg disabled:opacity-50">
               <Send size={16} />
             </button>
           </div>
        </div>
      )}
    </div>
  );
};

export default ReviewSection;