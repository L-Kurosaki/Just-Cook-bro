import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, Linking, Image } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Play, Pause, SkipForward, ArrowLeft, MessageCircle, AlertCircle, Music, Flame, Utensils, AlertTriangle, ListMusic, Plus, Share2, Check } from 'lucide-react-native';
import { Recipe, SpotifyTrack } from '../types';
import { getCookingHelp } from '../services/geminiService';
import { spotifyService } from '../services/spotifyService';
import { Audio } from 'expo-av';

interface CookingModeProps {
  recipes: Recipe[];
  onAddMusicToHistory: (track: SpotifyTrack) => void;
  onShareToFeed: (recipe: Recipe, track?: SpotifyTrack) => void;
}

const CookingMode: React.FC<CookingModeProps> = ({ recipes, onAddMusicToHistory, onShareToFeed }) => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { id } = route.params;
  const recipe = recipes.find(r => r.id === id);

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [helpMessage, setHelpMessage] = useState<string>("");
  const [isLoadingHelp, setIsLoadingHelp] = useState(false);
  const [timerAlert, setTimerAlert] = useState(false);
  
  const [spotifyToken, setSpotifyToken] = useState<string | null>(null);
  const [currentTrack, setCurrentTrack] = useState<SpotifyTrack | null>(null);
  const [isShared, setIsShared] = useState(false);

  const currentStep = recipe?.steps[currentStepIndex];

  // Spotify Auth Listener
  useEffect(() => {
    const handleUrl = (event: { url: string }) => {
        const token = spotifyService.extractTokenFromUrl(event.url);
        if (token) setSpotifyToken(token);
    };
    const sub = Linking.addEventListener('url', handleUrl);
    return () => sub.remove();
  }, []);

  // Poll Spotify
  useEffect(() => {
    if (!spotifyToken) return;
    const checkMusic = async () => {
        const track = await spotifyService.getCurrentlyPlaying(spotifyToken);
        if (track && track.name !== currentTrack?.name) {
            setCurrentTrack(track);
            onAddMusicToHistory(track);
        }
    };
    const interval = setInterval(checkMusic, 20000);
    return () => clearInterval(interval);
  }, [spotifyToken, currentTrack]);

  // Timer Logic
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
    let interval: ReturnType<typeof setInterval>;
    if (isTimerRunning && timeLeft !== null && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => (prev !== null ? prev - 1 : 0));
      }, 1000);
    } else if (timeLeft === 0 && isTimerRunning) {
      setIsTimerRunning(false);
      setTimerAlert(true);
      playSound();
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timeLeft]);

  const playSound = async () => {
      try {
          const { sound } = await Audio.Sound.createAsync(
             // Placeholder sound URL
             { uri: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3' }
          );
          await sound.playAsync();
      } catch(e) { console.log('Audio error', e); }
  };

  const handleNextStep = () => {
    if (!recipe) return;
    if (currentStepIndex < recipe.steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
      setShowHelp(false);
      setHelpMessage("");
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
      setHelpMessage("Trust your gut!");
    } finally {
      setIsLoadingHelp(false);
    }
  };

  if (!recipe || !currentStep) return <View><Text>Recipe not found</Text></View>;

  const progress = ((currentStepIndex + 1) / recipe.steps.length) * 100;
  const isFinished = currentStepIndex === recipe.steps.length - 1;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View className={`flex-1 ${timerAlert ? 'bg-red-50' : 'bg-white'}`}>
      <View className="flex-row items-center justify-between p-4 border-b border-gray-100 mt-10">
        <TouchableOpacity onPress={() => navigation.goBack()} className="p-2">
          <ArrowLeft size={24} stroke="#2E2E2E" />
        </TouchableOpacity>
        <View className="flex-1 mx-4">
          <View className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <View className="h-full bg-gold" style={{ width: `${progress}%` }} />
          </View>
          <Text className="text-xs text-center mt-1 text-midGrey">Step {currentStepIndex + 1} of {recipe.steps.length}</Text>
        </View>
        <TouchableOpacity>
            <ListMusic size={24} stroke="#6B6B6B" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 p-6" contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* Spotify */}
        {!spotifyToken ? (
            <TouchableOpacity 
                onPress={() => Linking.openURL(spotifyService.getAuthUrl())}
                className="bg-black p-4 rounded-xl flex-row items-center justify-between mb-6"
            >
                <View className="flex-row items-center gap-3">
                    <Music size={20} stroke="#1DB954" />
                    <View>
                        <Text className="text-xs font-bold text-white">Connect Spotify</Text>
                        <Text className="text-[10px] text-gray-400">Log your cooking jams</Text>
                    </View>
                </View>
                <Plus size={16} stroke="gray" />
            </TouchableOpacity>
        ) : (
             currentTrack && (
                <View className="bg-[#1DB954]/5 border border-[#1DB954]/20 p-3 rounded-xl mb-6 flex-row items-center gap-3">
                    {currentTrack.albumArt ? (
                        <Image source={{ uri: currentTrack.albumArt }} className="w-10 h-10 rounded-md" />
                    ) : <View className="w-10 h-10 bg-[#1DB954] rounded-md" />}
                    <View className="flex-1">
                        <Text className="text-[10px] uppercase font-bold text-[#1DB954] mb-0.5">Now Playing</Text>
                        <Text className="text-sm font-bold text-dark" numberOfLines={1}>{currentTrack.name}</Text>
                        <Text className="text-xs text-midGrey" numberOfLines={1}>{currentTrack.artist}</Text>
                    </View>
                </View>
             )
        )}

        <View className="items-center mb-8">
            <View className="w-24 h-24 bg-secondary rounded-full items-center justify-center mb-4">
                 <Utensils size={40} stroke="#C9A24D" />
            </View>
            <Text className="text-2xl font-bold text-dark text-center leading-tight">{currentStep.instruction}</Text>
        </View>

        {currentStep.warning && (
          <View className="bg-red-50 p-4 rounded-lg flex-row items-center gap-2 mb-6">
             <AlertTriangle size={20} stroke="#DC2626" />
             <Text className="text-xs font-bold uppercase text-red-600">{currentStep.warning}</Text>
          </View>
        )}

        {currentStep.tip && (
        <View className="bg-blue-50 border border-blue-100 p-4 rounded-xl mb-6 flex-row gap-3">
            <Text className="text-xl">💡</Text>
            <View className="flex-1">
                <Text className="font-bold text-blue-900 text-[10px] uppercase mb-1">Chef's Tip</Text>
                <Text className="text-sm text-blue-800 italic">"{currentStep.tip}"</Text>
            </View>
        </View>
        )}

        {timeLeft !== null && (
          <View className={`rounded-2xl p-6 items-center justify-center mb-6 border ${timerAlert ? 'bg-red-100 border-red-500' : 'bg-secondary border-gray-200'}`}>
            <Text className={`text-6xl font-bold mb-6 ${timerAlert ? 'text-red-600' : 'text-dark'}`}>
              {formatTime(timeLeft)}
            </Text>
            <TouchableOpacity 
                onPress={() => { setIsTimerRunning(!isTimerRunning); setTimerAlert(false); }}
                className="w-16 h-16 rounded-full bg-gold items-center justify-center shadow-lg"
            >
                {isTimerRunning ? <Pause size={32} stroke="white" /> : <Play size={32} stroke="white" style={{ marginLeft: 4 }} />}
            </TouchableOpacity>
          </View>
        )}

        {showHelp && (
           <View className="bg-dark p-5 rounded-xl mb-6 border-l-4 border-gold">
             <View className="flex-row items-start gap-3">
               <MessageCircle size={20} stroke="#C9A24D" />
               <View className="flex-1">
                 <Text className="font-bold text-gold text-xs uppercase mb-1">AI Assistant</Text>
                 <Text className="text-white text-sm leading-relaxed">{isLoadingHelp ? "Thinking..." : helpMessage}</Text>
               </View>
             </View>
           </View>
        )}

      </ScrollView>

      <View className="p-6 border-t border-secondary bg-white">
         <View className="flex-row gap-4 mb-4">
            <TouchableOpacity 
              onPress={handleAskHelp}
              className="flex-1 bg-secondary py-4 rounded-xl flex-row items-center justify-center gap-2"
            >
              <AlertCircle size={16} stroke="#2E2E2E" />
              <Text className="text-dark font-bold text-sm">Help?</Text>
            </TouchableOpacity>
         </View>
         
         {!isFinished ? (
            <TouchableOpacity 
              onPress={handleNextStep}
              className="w-full bg-gold py-4 rounded-xl shadow-lg flex-row items-center justify-center gap-2"
            >
              <Text className="text-white text-lg font-bold">Next Step</Text>
              <SkipForward size={20} stroke="white" />
            </TouchableOpacity>
         ) : (
            <View className="gap-3">
                <TouchableOpacity 
                  onPress={() => { onShareToFeed(recipe, currentTrack || undefined); setIsShared(true); }}
                  disabled={isShared}
                  className={`w-full py-4 rounded-xl shadow-lg flex-row items-center justify-center gap-2 ${isShared ? 'bg-green-500' : 'bg-black'}`}
                >
                   {isShared ? <Check size={20} stroke="white" /> : <Share2 size={20} stroke="white" />}
                   <Text className="text-white text-lg font-bold">{isShared ? 'Shared!' : 'Share to Feed'}</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                   onPress={() => navigation.navigate('Home')}
                   className="w-full bg-secondary py-4 rounded-xl items-center justify-center"
                >
                    <Text className="text-dark text-lg font-bold">Done Cooking</Text>
                </TouchableOpacity>
            </View>
         )}
      </View>
    </View>
  );
};

export default CookingMode;