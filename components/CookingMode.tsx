import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, Pause, SkipForward, ArrowLeft, MessageCircle, AlertCircle } from 'lucide-react';
import { Recipe } from '../types';
import { getCookingHelp } from '../services/geminiService';

interface CookingModeProps {
  recipes: Recipe[];
}

const CookingMode: React.FC<CookingModeProps> = ({ recipes }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const recipe = recipes.find(r => r.id === id);

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [helpMessage, setHelpMessage] = useState<string>("");
  const [isLoadingHelp, setIsLoadingHelp] = useState(false);

  const currentStep = recipe?.steps[currentStepIndex];

  useEffect(() => {
    if (currentStep?.timeInSeconds) {
      setTimeLeft(currentStep.timeInSeconds);
      setIsTimerRunning(false);
    } else {
      setTimeLeft(null);
    }
  }, [currentStepIndex, currentStep]);

  useEffect(() => {
    let interval: number;
    if (isTimerRunning && timeLeft !== null && timeLeft > 0) {
      interval = window.setInterval(() => {
        setTimeLeft((prev) => (prev !== null ? prev - 1 : 0));
      }, 1000);
    } else if (timeLeft === 0) {
      setIsTimerRunning(false);
      // Play sound or alert here in real app
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timeLeft]);

  const handleNextStep = () => {
    if (!recipe) return;
    if (currentStepIndex < recipe.steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      // Finish
      navigate('/');
    }
  };

  const handleAskHelp = async () => {
    if (!currentStep) return;
    setIsLoadingHelp(true);
    setShowHelp(true);
    try {
      const msg = await getCookingHelp(currentStep.instruction, recipe?.title || "");
      setHelpMessage(msg);
    } catch (error) {
      setHelpMessage("Sorry, I couldn't connect to the kitchen brain. Trust your gut!");
    } finally {
      setIsLoadingHelp(false);
    }
  };

  if (!recipe || !currentStep) return <div className="p-6">Recipe not found</div>;

  const progress = ((currentStepIndex + 1) / recipe.steps.length) * 100;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-screen bg-primary">
      {/* Top Bar */}
      <div className="flex items-center justify-between p-4 border-b border-secondary">
        <button onClick={() => navigate(-1)} className="p-2 text-dark">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex-1 mx-4">
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div 
              className="h-full bg-gold transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-center mt-1 text-midGrey">Step {currentStepIndex + 1} of {recipe.steps.length}</p>
        </div>
        <div className="w-10" /> {/* Spacer */}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col p-6 overflow-y-auto">
        <h2 className="text-2xl font-bold text-dark mb-6 leading-tight">
          {currentStep.instruction}
        </h2>

        {currentStep.tip && (
          <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl mb-6">
            <div className="flex items-start gap-3">
              <span className="text-xl">💡</span>
              <p className="text-sm text-dark italic">"{currentStep.tip}"</p>
            </div>
          </div>
        )}

        {/* Timer */}
        {timeLeft !== null && (
          <div className="bg-secondary rounded-2xl p-6 flex flex-col items-center justify-center mb-6">
            <div className="text-5xl font-mono font-bold text-dark mb-4 tracking-wider">
              {formatTime(timeLeft)}
            </div>
            <div className="flex gap-4">
              <button 
                onClick={() => setIsTimerRunning(!isTimerRunning)}
                className="w-14 h-14 rounded-full bg-gold flex items-center justify-center text-white shadow-lg active:scale-95 transition-transform"
              >
                {isTimerRunning ? <Pause /> : <Play className="ml-1" />}
              </button>
            </div>
          </div>
        )}

        {/* Help Section */}
        {showHelp && (
           <div className="bg-dark text-primary p-4 rounded-xl mb-6 animate-fade-in">
             <div className="flex items-start gap-3">
               <MessageCircle className="w-5 h-5 text-gold shrink-0 mt-1" />
               <div>
                 <p className="text-sm">{isLoadingHelp ? "Thinking..." : helpMessage}</p>
               </div>
             </div>
           </div>
        )}

      </div>

      {/* Sticky Bottom Actions */}
      <div className="p-6 border-t border-secondary bg-primary">
         <div className="flex gap-4 mb-4">
            <button 
              onClick={handleAskHelp}
              className="flex-1 bg-secondary text-dark py-3 rounded-lg font-medium text-sm flex items-center justify-center gap-2 border border-secondary"
            >
              <AlertCircle className="w-4 h-4" />
              Am I doing this right?
            </button>
         </div>
        
        <button 
          onClick={handleNextStep}
          className="w-full bg-gold text-white text-lg font-bold py-4 rounded-xl shadow-lg active:bg-[#B89240] transition-colors flex items-center justify-center gap-2"
        >
          {currentStepIndex === recipe.steps.length - 1 ? "Finish Cooking! 🎉" : "Next Step"}
          {currentStepIndex < recipe.steps.length - 1 && <SkipForward className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
};

export default CookingMode;