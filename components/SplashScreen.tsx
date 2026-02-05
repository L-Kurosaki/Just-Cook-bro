import React, { useEffect, useState } from 'react';

const SplashScreen: React.FC<{ onFinish: () => void }> = ({ onFinish }) => {
  const [fade, setFade] = useState(false);

  useEffect(() => {
    // Start fade out slightly before unmounting
    const fadeTimer = setTimeout(() => {
      setFade(true);
    }, 2000);

    const finishTimer = setTimeout(() => {
      onFinish();
    }, 2500);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(finishTimer);
    };
  }, [onFinish]);

  return (
    <div className={`fixed inset-0 z-50 bg-white flex flex-col items-center justify-center transition-opacity duration-500 ${fade ? 'opacity-0' : 'opacity-100'}`}>
      <div className="w-40 h-40 mb-6 animate-bounce">
        <img src="assets/logo.png" alt="Just Cook Bro" className="w-full h-full object-contain" />
      </div>
      <h1 className="text-2xl font-bold text-dark tracking-wider uppercase animate-pulse">Just Cook Bro</h1>
    </div>
  );
};

export default SplashScreen;