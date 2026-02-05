import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { LogIn, UserPlus, Loader } from 'lucide-react';

interface AuthProps {
  onAuthSuccess: (user: any) => void;
}

const Auth: React.FC<AuthProps> = ({ onAuthSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let result;
      if (isLogin) {
        result = await supabase.auth.signInWithPassword({ email, password });
      } else {
        result = await supabase.auth.signUp({ email, password });
      }

      if (result.error) throw result.error;

      if (result.data.user) {
        onAuthSuccess(result.data.user);
      } else if (!isLogin) {
        setError("Check your email for the confirmation link!");
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 animate-fade-in bg-white">
      {/* Logo & Tagline - ABOVE Sign In */}
      <div className="flex flex-col items-center mb-10">
        <div className="w-32 h-32 mb-4">
            <img src="assets/logo.png" alt="Just Cook Bro" className="w-full h-full object-contain" />
        </div>
        <h1 className="text-3xl font-bold text-dark mb-2">Just Cook Bro</h1>
        <p className="text-midGrey font-medium text-sm text-center">Recipes, organized. Cooking, simplified.</p>
      </div>

      <div className="bg-secondary/30 p-8 rounded-3xl w-full max-w-sm border border-secondary backdrop-blur-sm">
        
        {/* Toggle Buttons */}
        <div className="flex bg-gray-200 p-1 rounded-xl mb-6 relative">
             <div 
                className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-lg shadow-sm transition-all duration-300 ${isLogin ? 'left-1' : 'left-[calc(50%+4px)]'}`}
             />
             <button 
                onClick={() => { setIsLogin(true); setError(null); }} 
                className={`flex-1 py-2 text-sm font-bold z-10 transition-colors ${isLogin ? 'text-dark' : 'text-midGrey'}`}
             >
                Sign In
             </button>
             <button 
                onClick={() => { setIsLogin(false); setError(null); }} 
                className={`flex-1 py-2 text-sm font-bold z-10 transition-colors ${!isLogin ? 'text-dark' : 'text-midGrey'}`}
             >
                Sign Up
             </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-500 text-xs p-3 rounded-lg mb-4 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-dark mb-1 ml-1">Email Address</label>
            <input 
              type="email" 
              required
              className="w-full p-3 bg-white rounded-xl text-sm border border-transparent focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20 transition-all"
              placeholder="chef@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-dark mb-1 ml-1">Password</label>
            <input 
              type="password" 
              required
              className="w-full p-3 bg-white rounded-xl text-sm border border-transparent focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20 transition-all"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-gold text-white font-bold py-4 rounded-xl shadow-lg hover:bg-[#B89240] active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4"
          >
            {loading ? <Loader className="animate-spin w-5 h-5" /> : (isLogin ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />)}
            {isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Auth;