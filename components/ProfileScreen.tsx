import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Share, Image, Alert, Platform } from 'react-native';
import { UserProfile } from '../types';
import { Crown, LogOut, Music, Share2, ChevronRight, Camera } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import Paywall from './Paywall';

interface ProfileScreenProps {
    userProfile: UserProfile;
    setPremium: (val: boolean) => void;
    onUpdateProfile: (p: UserProfile) => void;
    onLogout: () => void;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ userProfile, setPremium, onUpdateProfile, onLogout }) => {
    const [showPaywall, setShowPaywall] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [dietary, setDietary] = useState(userProfile.dietaryPreferences.join(', '));
    const [allergies, setAllergies] = useState(userProfile.allergies.join(', '));
    const [name, setName] = useState(userProfile.name);
    const [showMusicHistory, setShowMusicHistory] = useState(false);

    const handleSaveProfile = () => {
        onUpdateProfile({
            ...userProfile,
            name: name,
            dietaryPreferences: dietary.split(',').map(s => s.trim()).filter(s => s),
            allergies: allergies.split(',').map(s => s.trim()).filter(s => s)
        });
        setEditMode(false);
    };

    const handlePickAvatar = async () => {
        try {
            let result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.5,
                base64: true,
            });

            if (!result.canceled && result.assets[0].base64) {
                const base64Img = `data:image/jpeg;base64,${result.assets[0].base64}`;
                onUpdateProfile({
                    ...userProfile,
                    avatarUrl: base64Img
                });
            }
        } catch (e) {
            Alert.alert("Error", "Could not upload image");
        }
    };

    const handleShareMusic = async () => {
        if (!userProfile.musicHistory || userProfile.musicHistory.length === 0) return;
        
        const text = "🎵 My Kitchen Jams from Just Cook Bro:\n" + 
                     userProfile.musicHistory.slice(0, 5).map(t => `- ${t.name} by ${t.artist}`).join('\n') +
                     "\n...and more!";
        
        try {
            await Share.share({ message: text });
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <ScrollView className="flex-1 bg-white p-6">
            <Text className="text-2xl font-bold text-dark mb-6">Profile</Text>
            
            <View className="bg-secondary p-6 rounded-2xl flex-row items-center gap-4 mb-6">
                <TouchableOpacity onPress={handlePickAvatar} className="relative">
                    {userProfile.avatarUrl ? (
                         <Image source={{ uri: userProfile.avatarUrl }} className="w-16 h-16 rounded-full" />
                    ) : (
                        <View className="w-16 h-16 bg-gold rounded-full items-center justify-center shadow-lg">
                            <Text className="text-white text-xl font-bold">{(userProfile.name || "C").charAt(0).toUpperCase()}</Text>
                        </View>
                    )}
                    <View className="absolute bottom-0 right-0 bg-dark p-1 rounded-full border border-white">
                        <Camera size={10} color="white" />
                    </View>
                </TouchableOpacity>

                <View className="flex-1">
                    {editMode ? (
                        <TextInput 
                            value={name} 
                            onChangeText={setName} 
                            className="font-bold text-lg text-dark border-b border-gold mb-1" 
                        />
                    ) : (
                        <Text className="font-bold text-lg text-dark">{userProfile.name}</Text>
                    )}
                    
                    <View className="flex-row items-center gap-1 mt-1">
                        {userProfile.isPremium ? (
                            <View className="bg-dark px-2 py-0.5 rounded-full flex-row items-center gap-1">
                                <Crown size={10} color="#C9A24D" />
                                <Text className="text-gold text-[10px] font-bold">PRO MEMBER</Text>
                            </View>
                        ) : (
                            <View className="bg-white px-2 py-0.5 rounded-full border border-gray-200">
                                <Text className="text-midGrey text-[10px] font-bold">Free Plan</Text>
                            </View>
                        )}
                    </View>
                </View>
            </View>

            {/* Music History Section */}
            <View className="bg-white border border-secondary rounded-xl p-4 mb-6">
                 <TouchableOpacity 
                    className="flex-row justify-between items-center" 
                    onPress={() => setShowMusicHistory(!showMusicHistory)}
                 >
                     <View className="flex-row items-center gap-2">
                         <Music size={18} color="#1DB954" />
                         <Text className="font-bold text-sm text-dark">Music Logs</Text>
                     </View>
                     <Text className="text-xs text-midGrey font-bold">{showMusicHistory ? "Hide" : "View"}</Text>
                 </TouchableOpacity>
                 
                 {showMusicHistory && (
                     <View className="mt-3">
                         {(!userProfile.musicHistory || userProfile.musicHistory.length === 0) ? (
                             <Text className="text-xs text-midGrey italic">No music logged yet. Connect Spotify while cooking!</Text>
                         ) : (
                             <>
                                <View className="mb-3">
                                    {userProfile.musicHistory.slice().reverse().map((track, idx) => (
                                        <View key={idx} className="flex-row items-center gap-3 bg-secondary/30 p-2 rounded-lg mb-1">
                                            {track.albumArt ? <Image source={{ uri: track.albumArt }} className="w-8 h-8 rounded" /> : <View className="w-8 h-8 bg-gray-200 rounded"/>}
                                            <View className="flex-1">
                                                <Text className="text-xs font-bold text-dark" numberOfLines={1}>{track.name}</Text>
                                                <Text className="text-[10px] text-midGrey" numberOfLines={1}>{track.artist}</Text>
                                            </View>
                                            <Text className="text-[8px] text-gray-400">{new Date(track.playedAt).toLocaleDateString()}</Text>
                                        </View>
                                    ))}
                                </View>
                                <TouchableOpacity onPress={handleShareMusic} className="w-full py-2 bg-green-50 rounded-lg flex-row items-center justify-center gap-2">
                                    <Share2 size={12} color="#1DB954" />
                                    <Text className="text-[#1DB954] text-xs font-bold">Share Logs</Text>
                                </TouchableOpacity>
                             </>
                         )}
                     </View>
                 )}
            </View>

            {/* Dietary Settings */}
            <View className="bg-white border border-secondary rounded-xl p-4 mb-6">
                <View className="flex-row justify-between items-center mb-4">
                     <Text className="font-bold text-sm text-dark">Dietary & Allergies</Text>
                     <TouchableOpacity onPress={() => editMode ? handleSaveProfile() : setEditMode(true)}>
                        <Text className="text-xs text-gold font-bold">{editMode ? "Save" : "Edit"}</Text>
                     </TouchableOpacity>
                </View>
                
                {editMode ? (
                    <View className="gap-3">
                        <View>
                            <Text className="text-xs text-midGrey mb-1">Dietary (comma separated)</Text>
                            <TextInput 
                                className="w-full bg-secondary p-2 rounded text-sm text-dark" 
                                value={dietary} 
                                onChangeText={setDietary} 
                                placeholder="e.g. Vegan, Keto" 
                            />
                        </View>
                        <View>
                            <Text className="text-xs text-midGrey mb-1">Allergies (comma separated)</Text>
                            <TextInput 
                                className="w-full bg-secondary p-2 rounded text-sm text-dark" 
                                value={allergies} 
                                onChangeText={setAllergies} 
                                placeholder="e.g. Peanuts, Gluten" 
                            />
                        </View>
                    </View>
                ) : (
                    <View className="gap-2">
                        <View className="flex-row flex-wrap gap-2">
                            {userProfile.dietaryPreferences.length === 0 && <Text className="text-xs text-midGrey">No preferences set</Text>}
                            {userProfile.dietaryPreferences.map(p => <Text key={p} className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded overflow-hidden">{p}</Text>)}
                        </View>
                        <View className="flex-row flex-wrap gap-2">
                             {userProfile.allergies.length === 0 && <Text className="text-xs text-midGrey">No allergies set</Text>}
                             {userProfile.allergies.map(p => <Text key={p} className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded overflow-hidden">No {p}</Text>)}
                        </View>
                    </View>
                )}
            </View>

            {!userProfile.isPremium && (
                <TouchableOpacity 
                    onPress={() => setShowPaywall(true)}
                    className="bg-gold p-6 rounded-2xl mb-8 shadow-lg"
                >
                    <View className="flex-row justify-between items-start mb-2">
                        <Text className="font-bold text-lg text-white">Upgrade to Pro</Text>
                        <Crown size={24} color="white" />
                    </View>
                    <Text className="text-sm text-white/90 mb-4">Unlimited recipes, offline access, and zero ads.</Text>
                    <View className="bg-white self-start px-4 py-2 rounded-lg">
                        <Text className="text-gold font-bold text-xs">View Plans</Text>
                    </View>
                </TouchableOpacity>
            )}

            <TouchableOpacity 
                onPress={onLogout}
                className="w-full p-4 bg-white border border-secondary rounded-xl flex-row items-center justify-between mb-20"
            >
                <View className="flex-row items-center gap-3">
                    <LogOut size={18} color="#EF4444" />
                    <Text className="text-red-500 font-bold">Sign Out</Text>
                </View>
                <ChevronRight size={16} color="#EF4444" />
            </TouchableOpacity>

            <Paywall visible={showPaywall} onClose={() => setShowPaywall(false)} onSuccess={() => { setPremium(true); setShowPaywall(false); }} />
        </ScrollView>
    );
};

export default ProfileScreen;