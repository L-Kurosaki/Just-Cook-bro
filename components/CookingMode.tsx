import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, Pause, SkipForward, ArrowLeft, MessageCircle, AlertCircle, Music, Flame, Utensils, AlertTriangle, ListMusic, Plus, Share2, Check } from 'lucide-react';
import { Recipe, SpotifyTrack } from '../types';
import { getCookingHelp } from '../services/geminiService';
import { spotifyService } from '../services/spotifyService';

interface CookingModeProps {
  recipes: Recipe[];
  onAddMusicToHistory: (track: SpotifyTrack) => void;
  onShareToFeed: (recipe: Recipe, track?: SpotifyTrack) => void; // New prop
}

const CookingMode: React.FC<CookingModeProps> = ({ recipes, onAddMusicToHistory, onShareToFeed }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const recipe = recipes.find(r => r.id === id);

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [helpMessage, setHelpMessage] = useState<string>("");
  const [isLoadingHelp, setIsLoadingHelp] = useState(false);
  const [timerAlert, setTimerAlert] = useState(false);
  
  // Spotify State
  const [spotifyToken, setSpotifyToken] = useState<string | null>(localStorage.getItem('jcb_spotify_token'));
  const [currentTrack, setCurrentTrack] = useState<SpotifyTrack | null>(null);
  const [sessionQueue, setSessionQueue] = useState<SpotifyTrack[]>([]);
  const [showQueue, setShowQueue] = useState(false);
  
  // Sharing State
  const [isShared, setIsShared] = useState(false);

  const currentStep = recipe?.steps[currentStepIndex];

  // Spotify Auth Effect
  useEffect(() => {
    const token = spotifyService.getTokenFromUrl();
    if (token) {
        setSpotifyToken(token);
        localStorage.setItem('jcb_spotify_token', token);
        window.location.hash = ""; 
    }
  }, []);

  // Poll Spotify API
  useEffect(() => {
    if (!spotifyToken) return;

    const checkMusic = async () => {
        const track = await spotifyService.getCurrentlyPlaying(spotifyToken);
        if (track) {
            setCurrentTrack(prev => {
                if (prev?.name !== track.name) {
                    setSessionQueue(q => {
                         if (q.length > 0 && q[q.length -1].name === track.name) return q;
                         return [...q, track];
                    });
                    onAddMusicToHistory(track);
                    return track;
                }
                return prev;
            });
        }
    };

    checkMusic(); 
    const interval = setInterval(checkMusic, 20000);
    return () => clearInterval(interval);
  }, [spotifyToken, onAddMusicToHistory]);

  useEffect(() => {
    if (currentStep?.timeInSeconds) {
      setTimeLeft(currentStep.timeInSeconds);
      setIsTimerRunning(false);
    } else {
      setTimeLeft(null);
    }
    setTimerAlert(false);
  }, [currentStepIndex, currentStep]);

  useEffect(() => {
    let interval: number;
    if (isTimerRunning && timeLeft !== null && timeLeft > 0) {
      interval = window.setInterval(() => {
        setTimeLeft((prev) => (prev !== null ? prev - 1 : 0));
      }, 1000);
    } else if (timeLeft === 0 && isTimerRunning) {
      setIsTimerRunning(false);
      setTimerAlert(true);
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'); 
      audio.play().catch(e => console.log("Audio autoplay blocked"));
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timeLeft]);

  const handleNextStep = () => {
    if (!recipe) return;
    if (currentStepIndex < recipe.steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
      setShowHelp(false);
      setHelpMessage("");
    }
  };
  
  const handleShare = () => {
      if(!recipe) return;
      onShareToFeed(recipe, currentTrack || undefined);
      setIsShared(true);
      alert("Shared to community feed with your vibe!");
  };

  const handleAskHelp = async () => {
    if (!currentStep) return;
    setIsLoadingHelp(true);
    setShowHelp(true);
    try {
      const msg = await getCookingHelp(currentStep.instruction, recipe?.title || "");
      setHelpMessage(msg);
    } catch (error) {
      setHelpMessage("Trust your gut!");
    } finally {
      setIsLoadingHelp(false);
    }
  };

  const handleConnectSpotify = () => {
      window.location.href = spotifyService.getAuthUrl();
  };

  const getActionIcon = (verb?: string) => {
    if (!verb) return <Utensils className="w-12 h-12 text-gold animate-bounce" />;
    const v = verb.toLowerCase();
    if (v.includes('boil') || v.includes('fry') || v.includes('cook')) return <Flame className="w-16 h-16 text-orange-500 animate-pulse" />;
    if (v.includes('chop') || v.includes('slice')) return <Utensils className="w-16 h-16 text-midGrey rotate-45" />;
    return <Utensils className="w-12 h-12 text-gold" />;
  };

  if (!recipe || !currentStep) return <div className="p-6">Recipe not found</div>;

  const progress = ((currentStepIndex + 1) / recipe.steps.length) * 100;
  const isFinished = currentStepIndex === recipe.steps.length - 1;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`flex flex-col h-screen transition-colors duration-500 ${timerAlert ? 'bg-red-50' : 'bg-primary'}`}>
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
        <button onClick={() => setShowQueue(!showQueue)} className={`p-2 rounded-full ${sessionQueue.length > 0 ? 'text-[#1DB954] bg-[#1DB954]/10' : 'text-midGrey'}`}>
            <ListMusic className="w-5 h-5" />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col p-6 overflow-y-auto">
        
        {/* Real Spotify Integration */}
        {!spotifyToken ? (
            <div 
                onClick={handleConnectSpotify}
                className="bg-black text-white p-3 rounded-xl flex items-center justify-between mb-6 cursor-pointer active:scale-95 transition-transform shadow-md"
            >
                <div className="flex items-center gap-3">
                    <Music className="w-5 h-5 text-[#1DB954]" />
                    <div>
                        <p className="text-xs font-bold">Connect Spotify</p>
                        <p className="text-[10px] text-gray-400">Log your cooking jams</p>
                    </div>
                </div>
                <Plus className="w-4 h-4 text-gray-400" />
            </div>
        ) : (
             currentTrack ? (
                <div className="bg-[#1DB954]/5 border border-[#1DB954]/20 p-3 rounded-xl mb-6 animate-fade-in relative">
                    <div className="flex items-center gap-3">
                        {currentTrack.albumArt ? (
                            <img src={currentTrack.albumArt} alt="Album Art" className="w-10 h-10 rounded-md shadow-sm animate-spin-slow" />
                        ) : (
                            <div className="w-10 h-10 bg-[#1DB954] rounded-md flex items-center justify-center text-white"><Music size={20} /></div>
                        )}
                        <div className="flex-1 overflow-hidden">
                            <p className="text-[10px] uppercase font-bold text-[#1DB954] mb-0.5 flex items-center gap-1">
                                Now Playing
                            </p>
                            <p className="text-sm font-bold text-dark truncate">{currentTrack.name}</p>
                            <p className="text-xs text-midGrey truncate">{currentTrack.artist}</p>
                        </div>
                    </div>
                </div>
             ) : (
                <div className="bg-secondary p-3 rounded-xl mb-6 flex items-center gap-3 opacity-50">
                    <Music className="w-5 h-5 text-midGrey" />
                    <p className="text-xs text-midGrey">Play music on Spotify to see it here...</p>
                </div>
             )
        )}

        {/* Queue / Session History Overlay */}
        {showQueue && (
             <div className="bg-white border border-secondary p-4 rounded-xl mb-6 shadow-sm animate-fade-in">
                 <h4 className="font-bold text-sm mb-3 flex items-center gap-2"><ListMusic size={14} /> Session History</h4>
                 {sessionQueue.length === 0 ? (
                     <p className="text-xs text-midGrey">No songs logged yet.</p>
                 ) : (
                     <div className="space-y-2 max-h-32 overflow-y-auto">
                         {sessionQueue.map((track, idx) => (
                             <div key={idx} className="flex items-center justify-between text-xs">
                                 <span className="truncate flex-1 font-medium">{track.name}</span>
                                 <span className="text-midGrey ml-2 text-[10px]">{new Date(track.playedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                             </div>
                         ))}
                     </div>
                 )}
             </div>
        )}

        {/* Animation & Action */}
        <div className="flex justify-center mb-6">
            <div className="w-24 h-24 bg-secondary rounded-full flex items-center justify-center shadow-inner">
                {getActionIcon(currentStep.actionVerb)}
            </div>
        </div>

        {/* Instruction */}
        <div className="flex-1 flex flex-col items-center text-center">
            <h2 className="text-2xl font-bold text-dark mb-4 leading-tight animate-fade-in-up">
            {currentStep.instruction}
            </h2>

            {currentStep.warning && (
              <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg flex items-center gap-2 mb-4 animate-pulse">
                 <AlertTriangle size={16} />
                 <span className="text-xs font-bold uppercase">{currentStep.warning}</span>
              </div>
            )}

            {currentStep.tip && (
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl mb-6 flex gap-3 text-left w-full">
                <span className="text-xl">💡</span>
                <div>
                    <h4 className="font-bold text-blue-900 text-[10px] uppercase mb-1">Chef's Tip</h4>
                    <p className="text-sm text-blue-800 italic">"{currentStep.tip}"</p>
                </div>
            </div>
            )}
        </div>

        {/* Timer */}
        {timeLeft !== null && (
          <div className={`rounded-2xl p-6 flex flex-col items-center justify-center mb-6 border transition-colors ${timerAlert ? 'bg-red-100 border-red-500' : 'bg-secondary border-gray-200'}`}>
            <div className={`text-6xl font-mono font-bold mb-6 tracking-wider ${timerAlert ? 'text-red-600' : 'text-dark'}`}>
              {formatTime(timeLeft)}
            </div>
            <div className="flex gap-4">
              <button 
                onClick={() => { setIsTimerRunning(!isTimerRunning); setTimerAlert(false); }}
                className="w-16 h-16 rounded-full bg-gold flex items-center justify-center text-white shadow-lg active:scale-95 transition-transform"
              >
                {isTimerRunning ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
              </button>
            </div>
          </div>
        )}

        {/* Help Section */}
        {showHelp && (
           <div className="bg-dark text-primary p-5 rounded-xl mb-6 animate-fade-in border-l-4 border-gold">
             <div className="flex items-start gap-3">
               <MessageCircle className="w-5 h-5 text-gold shrink-0 mt-1" />
               <div className="flex-1">
                 <h4 className="font-bold text-gold text-xs uppercase mb-1">AI Assistant</h4>
                 <p className="text-sm leading-relaxed">{isLoadingHelp ? "Thinking..." : helpMessage}</p>
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
              className="flex-1 bg-secondary text-dark py-4 rounded-xl font-medium text-sm flex items-center justify-center gap-2 border border-secondary hover:bg-gray-200 transition-colors"
            >
              <AlertCircle className="w-4 h-4" />
              Help?
            </button>
         </div>
         
         {!isFinished ? (
            <button 
              onClick={handleNextStep}
              className="w-full bg-gold text-white text-lg font-bold py-4 rounded-xl shadow-lg active:bg-[#B89240] transition-colors flex items-center justify-center gap-2"
            >
              Next Step <SkipForward className="w-5 h-5" />
            </button>
         ) : (
            <div className="flex flex-col gap-3">
                {!isShared ? (
                    <button 
                      onClick={handleShare}
                      className="w-full bg-black text-white text-lg font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2"
                    >
                       <Share2 className="w-5 h-5" /> Share to Feed
                    </button>
                ) : (
                    <button className="w-full bg-green-500 text-white text-lg font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-default">
                        <Check className="w-5 h-5" /> Shared!
                    </button>
                )}
                
                <button 
                   onClick={() => navigate('/')}
                   className="w-full bg-secondary text-dark text-lg font-bold py-4 rounded-xl shadow-sm flex items-center justify-center gap-2"
                >
                    Done Cooking
                </button>
            </div>
         )}
      </div>
    </div>
  );
};

export default CookingMode;