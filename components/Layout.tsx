import React from 'react';
import { ChefHat, Home, User, Search } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-primary text-dark flex flex-col max-w-md mx-auto shadow-2xl overflow-hidden relative">
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between bg-primary border-b border-secondary sticky top-0 z-20">
        <Link to="/" className="flex items-center gap-2">
          <ChefHat className="text-gold w-6 h-6" />
          <h1 className="font-bold text-lg tracking-tight">Just Cook Bro</h1>
        </Link>
        <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center text-xs font-bold text-midGrey">
          JB
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-24">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 w-full max-w-md bg-primary border-t border-secondary px-6 py-3 flex justify-between items-center z-20">
        <Link to="/" className={`flex flex-col items-center gap-1 ${isActive('/') ? 'text-gold' : 'text-midGrey'}`}>
          <Home className="w-6 h-6" />
          <span className="text-[10px] font-medium">Home</span>
        </Link>
        <Link to="/discover" className={`flex flex-col items-center gap-1 ${isActive('/discover') ? 'text-gold' : 'text-midGrey'}`}>
          <Search className="w-6 h-6" />
          <span className="text-[10px] font-medium">Find</span>
        </Link>
        <Link to="/profile" className={`flex flex-col items-center gap-1 ${isActive('/profile') ? 'text-gold' : 'text-midGrey'}`}>
          <User className="w-6 h-6" />
          <span className="text-[10px] font-medium">Profile</span>
        </Link>
      </nav>
    </div>
  );
};

export default Layout;