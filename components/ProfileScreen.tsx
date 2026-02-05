import React, { useState } from 'react';
import { UserProfile } from '../types';
import { Crown, LogOut, Settings, History, Music, Share2 } from 'lucide-react';
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
    const [showMusicHistory, setShowMusicHistory] = useState(false);

    const handleSaveProfile = () => {
        onUpdateProfile({
            ...userProfile,
            dietaryPreferences: dietary.split(',').map(s => s.trim()).filter(s => s),
            allergies: allergies.split(',').map(s => s.trim()).filter(s => s)
        });
        setEditMode(false);
    };

    const handleShareMusic = () => {
        if (!userProfile.musicHistory || userProfile.musicHistory.length === 0) return;
        
        const text = "🎵 My Kitchen Jams from Just Cook Bro:\n" + 
                     userProfile.musicHistory.slice(0, 5).map(t => `- ${t.name} by ${t.artist}`).join('\n') +
                     "\n...and more!";
        
        if (navigator.share) {
            navigator.share({ title: 'My Cooking Playlist', text }).catch(console.error);
        } else {
            navigator.clipboard.writeText(text);
            alert("Playlist copied to clipboard!");
        }
    };

    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold text-dark mb-6">Profile</h2>
            
            <div className="bg-secondary p-6 rounded-2xl flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-gold text-white rounded-full flex items-center justify-center text-xl font-bold shadow-lg">
                    {userProfile.name.charAt(0)}
                </div>
                <div>
                    <h3 className="font-bold text-lg">{userProfile.name}</h3>
                    <div className="flex items-center gap-1">
                        {userProfile.isPremium ? (
                            <span className="bg-dark text-gold text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Crown size={10} /> PRO MEMBER
                            </span>
                        ) : (
                            <span className="bg-white text-midGrey text-[10px] font-bold px-2 py-0.5 rounded-full border border-gray-200">
                                Free Plan
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Music History Section */}
            <div className="bg-white border border-secondary rounded-xl p-4 mb-6">
                 <div className="flex justify-between items-center mb-2" onClick={() => setShowMusicHistory(!showMusicHistory)}>
                     <div className="flex items-center gap-2">
                         <Music size={18} className="text-[#1DB954]" />
                         <h3 className="font-bold text-sm">Music Logs</h3>
                     </div>
                     <button className="text-xs text-midGrey font-bold">
                        {showMusicHistory ? "Hide" : "View"}
                     </button>
                 </div>
                 
                 {showMusicHistory && (
                     <div className="mt-3 animate-fade-in">
                         {(!userProfile.musicHistory || userProfile.musicHistory.length === 0) ? (
                             <p className="text-xs text-midGrey italic">No music logged yet. Connect Spotify while cooking!</p>
                         ) : (
                             <>
                                <div className="max-h-40 overflow-y-auto space-y-2 mb-3">
                                    {userProfile.musicHistory.slice().reverse().map((track, idx) => (
                                        <div key={idx} className="flex items-center gap-3 bg-secondary/30 p-2 rounded-lg">
                                            {track.albumArt ? <img src={track.albumArt} className="w-8 h-8 rounded" alt="" /> : <div className="w-8 h-8 bg-gray-200 rounded"/>}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold truncate">{track.name}</p>
                                                <p className="text-[10px] text-midGrey truncate">{track.artist}</p>
                                            </div>
                                            <span className="text-[8px] text-gray-400">{new Date(track.playedAt).toLocaleDateString()}</span>
                                        </div>
                                    ))}
                                </div>
                                <button onClick={handleShareMusic} className="w-full py-2 bg-[#1DB954]/10 text-[#1DB954] rounded-lg text-xs font-bold flex items-center justify-center gap-2">
                                    <Share2 size={12} /> Share Logs
                                </button>
                             </>
                         )}
                     </div>
                 )}
            </div>

            {/* Dietary Settings */}
            <div className="bg-white border border-secondary rounded-xl p-4 mb-6">
                <div className="flex justify-between items-center mb-4">
                     <h3 className="font-bold text-sm">Dietary & Allergies</h3>
                     <button onClick={() => editMode ? handleSaveProfile() : setEditMode(true)} className="text-xs text-gold font-bold">
                        {editMode ? "Save" : "Edit"}
                     </button>
                </div>
                
                {editMode ? (
                    <div className="space-y-3">
                        <div>
                            <label className="text-xs text-midGrey">Dietary (comma separated)</label>
                            <input className="w-full bg-secondary p-2 rounded text-sm" value={dietary} onChange={e => setDietary(e.target.value)} placeholder="e.g. Vegan, Keto" />
                        </div>
                        <div>
                            <label className="text-xs text-midGrey">Allergies (comma separated)</label>
                            <input className="w-full bg-secondary p-2 rounded text-sm" value={allergies} onChange={e => setAllergies(e.target.value)} placeholder="e.g. Peanuts, Gluten" />
                        </div>
                    </div>
                ) : (
                    <div className="space-y-2">
                        <div className="flex flex-wrap gap-2">
                            {userProfile.dietaryPreferences.length === 0 && <span className="text-xs text-midGrey">No preferences set</span>}
                            {userProfile.dietaryPreferences.map(p => <span key={p} className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">{p}</span>)}
                        </div>
                        <div className="flex flex-wrap gap-2">
                             {userProfile.allergies.length === 0 && <span className="text-xs text-midGrey">No allergies set</span>}
                             {userProfile.allergies.map(p => <span key={p} className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">No {p}</span>)}
                        </div>
                    </div>
                )}
            </div>

            {!userProfile.isPremium && (
                <div 
                    onClick={() => setShowPaywall(true)}
                    className="bg-gradient-to-r from-gold to-[#E5C265] p-6 rounded-2xl mb-8 text-white shadow-lg cursor-pointer transform transition-transform hover:scale-[1.02]"
                >
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-lg">Upgrade to Pro</h3>
                        <Crown className="w-6 h-6" />
                    </div>
                    <p className="text-sm opacity-90 mb-4">Unlimited recipes, offline access, and zero ads.</p>
                    <button className="bg-white text-gold font-bold text-xs px-4 py-2 rounded-lg">View Plans</button>
                </div>
            )}

            <button 
                onClick={onLogout}
                className="w-full p-4 bg-white border border-secondary rounded-xl flex items-center justify-between text-red-500"
            >
                <span className="flex items-center gap-3"><LogOut size={18} /> Sign Out</span>
            </button>

            {showPaywall && <Paywall onClose={() => setShowPaywall(false)} onSuccess={() => { setPremium(true); setShowPaywall(false); }} />}
        </div>
    );
};

export default ProfileScreen;