import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { supabase } from '../services/supabaseClient';
import { LogIn, UserPlus } from 'lucide-react-native';

// Fix for "Cannot find name 'require'" error when @types/node is missing
declare const require: any;

interface AuthProps {
  onAuthSuccess: (user: any) => void;
}

const Auth: React.FC<AuthProps> = ({ onAuthSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async () => {
    setLoading(true);
    setError(null);

    try {
      const auth = supabase.auth as any;
      let result;

      if (isLogin) {
          // Attempt v2 method, fallback to v1 method
          if (auth.signInWithPassword) {
              result = await auth.signInWithPassword({ email, password });
          } else {
              result = await auth.signIn({ email, password });
          }
      } else {
          // Attempt sign up
          result = await auth.signUp({ email, password });
      }

      const { data, error, user, session } = result || {};

      if (error) throw error;

      // Handle both v2 structure (data.user) and v1 structure (user)
      const resolvedUser = user || data?.user;
      const resolvedSession = session || data?.session;

      if (resolvedUser && resolvedSession) {
        onAuthSuccess(resolvedUser);
      } else if (!isLogin && resolvedUser && !resolvedSession) {
        setError("Success! Please check your email to confirm.");
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 items-center justify-center bg-white p-6">
      <View className="items-center mb-10">
        <View className="w-32 h-32 mb-4">
             {/* Ensure you have assets/logo.png in your Expo project or use a URI */}
             <Image source={require('../assets/logo.png')} className="w-full h-full" resizeMode="contain" />
        </View>
        <Text className="text-3xl font-bold text-dark mb-2">Just Cook Bro</Text>
        <Text className="text-midGrey font-medium text-sm text-center">Recipes, organized. Cooking, simplified.</Text>
      </View>

      <View className="bg-secondary/30 p-8 rounded-3xl w-full max-w-sm border border-secondary">
        
        {/* Toggle */}
        <View className="flex-row bg-gray-200 p-1 rounded-xl mb-6">
             <TouchableOpacity 
                onPress={() => { setIsLogin(true); setError(null); }} 
                className={`flex-1 py-2 rounded-lg items-center ${isLogin ? 'bg-white shadow-sm' : ''}`}
             >
                <Text className={`text-sm font-bold ${isLogin ? 'text-dark' : 'text-midGrey'}`}>Sign In</Text>
             </TouchableOpacity>
             <TouchableOpacity 
                onPress={() => { setIsLogin(false); setError(null); }} 
                className={`flex-1 py-2 rounded-lg items-center ${!isLogin ? 'bg-white shadow-sm' : ''}`}
             >
                <Text className={`text-sm font-bold ${!isLogin ? 'text-dark' : 'text-midGrey'}`}>Sign Up</Text>
             </TouchableOpacity>
        </View>

        {error && (
          <View className={`p-3 rounded-lg mb-4 ${error.includes('Success') ? 'bg-green-50' : 'bg-red-50'}`}>
            <Text className={`text-xs text-center ${error.includes('Success') ? 'text-green-600' : 'text-red-500'}`}>{error}</Text>
          </View>
        )}

        <View className="space-y-4">
          <View>
            <Text className="text-xs font-bold text-dark mb-1 ml-1">Email Address</Text>
            <TextInput 
              autoCapitalize="none"
              className="w-full p-3 bg-white rounded-xl text-sm"
              placeholder="chef@example.com"
              value={email}
              onChangeText={setEmail}
            />
          </View>
          <View>
            <Text className="text-xs font-bold text-dark mb-1 ml-1">Password</Text>
            <TextInput 
              secureTextEntry
              className="w-full p-3 bg-white rounded-xl text-sm"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <TouchableOpacity 
            onPress={handleAuth}
            disabled={loading}
            className="w-full bg-gold py-4 rounded-xl shadow-lg flex-row items-center justify-center gap-2 mt-4"
          >
            {loading ? <ActivityIndicator color="white" /> : (
                <View className="flex-row items-center gap-2">
                    {isLogin ? <LogIn size={20} color="white" /> : <UserPlus size={20} color="white" />}
                    <Text className="text-white font-bold">{isLogin ? 'Sign In' : 'Create Account'}</Text>
                </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default Auth;