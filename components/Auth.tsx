import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { supabase } from '../services/supabaseClient';
import { LogIn, UserPlus, ChefHat } from 'lucide-react-native';

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
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const auth = supabase.auth;
      let result;

      if (isLogin) {
          result = await auth.signInWithPassword({ email, password });
      } else {
          result = await auth.signUp({ email, password });
      }

      const { data, error } = result;

      if (error) throw error;

      if (data?.user && data?.session) {
        onAuthSuccess(data.user);
      } else if (!isLogin && data?.user && !data?.session) {
        setError("Success! Please check your email to confirm before logging in.");
        // Switch back to login to encourage them to sign in after confirming
        setIsLogin(true);
      }
    } catch (err: any) {
      console.error(err);
      let msg = err.message || "Authentication failed";
      if (msg.includes("Invalid login")) {
          msg = "Invalid credentials. If you just signed up, did you confirm your email address?";
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 items-center justify-center bg-white p-6">
      <View className="items-center mb-10">
        <View className="w-32 h-32 mb-4 bg-gold/10 rounded-full items-center justify-center border-4 border-gold/20">
             <ChefHat size={64} stroke="#C9A24D" />
        </View>
        <Text className="text-3xl font-bold text-dark mb-2">Just Cook Bro</Text>
        <Text className="text-midGrey font-medium text-sm text-center">Recipes, organized. Cooking, simplified.</Text>
      </View>

      <View className="bg-secondary/30 p-8 rounded-3xl w-full max-w-sm border border-secondary shadow-sm">
        
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
          <View className={`p-3 rounded-lg mb-4 ${error.includes('Success') ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <Text className={`text-xs text-center font-medium ${error.includes('Success') ? 'text-green-700' : 'text-red-600'}`}>{error}</Text>
          </View>
        )}

        <View className="space-y-4 gap-4">
          <View>
            <Text className="text-xs font-bold text-dark mb-1 ml-1">Email Address</Text>
            <TextInput 
              autoCapitalize="none"
              keyboardType="email-address"
              className="w-full p-3 bg-white rounded-xl text-sm border border-gray-100 focus:border-gold"
              placeholder="chef@example.com"
              value={email}
              onChangeText={setEmail}
            />
          </View>
          <View>
            <Text className="text-xs font-bold text-dark mb-1 ml-1">Password</Text>
            <TextInput 
              secureTextEntry
              className="w-full p-3 bg-white rounded-xl text-sm border border-gray-100 focus:border-gold"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <TouchableOpacity 
            onPress={handleAuth}
            disabled={loading}
            className={`w-full py-4 rounded-xl shadow-lg flex-row items-center justify-center gap-2 mt-2 ${loading ? 'bg-gold/70' : 'bg-gold'}`}
          >
            {loading ? <ActivityIndicator color="white" /> : (
                <View className="flex-row items-center gap-2">
                    {isLogin ? <LogIn size={20} stroke="white" /> : <UserPlus size={20} stroke="white" />}
                    <Text className="text-white font-bold text-base">{isLogin ? 'Sign In' : 'Create Account'}</Text>
                </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default Auth;