'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSupabase } from '@/lib/SupabaseContext';

export default function Auth() {
  const { signIn, signUp, authError } = useSupabase();
  
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const getGeneratedEmail = (userStr: string) => {
    // Generate a consistent, valid email address based on username
    const normalized = userStr.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
    return `${normalized || 'user'}@leadapp.local`;
  };

  const validateForm = () => {
    setValidationError(null);

    const cleanUsername = username.trim();
    if (!cleanUsername) {
      setValidationError('Please enter a username.');
      return false;
    }

    if (cleanUsername.length < 3) {
      setValidationError('Username must be at least 3 characters long.');
      return false;
    }

    // Validate password PIN is exactly 4 digits
    if (!/^\d{4}$/.test(pin)) {
      setValidationError('PIN must be exactly 4 digits (numbers only).');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    const cleanUsername = username.trim();
    const fakeEmail = getGeneratedEmail(cleanUsername);
    let success = false;

    if (isSignUp) {
      // Use cleanUsername as display name and fakeEmail under the hood
      success = await signUp(fakeEmail, cleanUsername, pin);
      if (success) {
        // Automatically attempt login after signup
        await signIn(fakeEmail, pin);
      }
    } else {
      success = await signIn(fakeEmail, pin);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
      {/* Light ray background */}
      <div 
        className="absolute top-[-20%] right-[-20%] w-[80%] h-[80%] opacity-30 pointer-events-none rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 70%)',
          filter: 'blur(100px)',
        }}
      />

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-[400px] bg-neutral-900/50 backdrop-blur-xl border border-neutral-800/80 rounded-[2.5rem] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.9)] space-y-6 relative z-10"
      >
        <div className="flex flex-col items-center text-center space-y-2">
          {/* Logo */}
          <div className="w-10 h-10 flex items-center justify-center text-neutral-300 mb-2">
            <svg width="28" height="28" viewBox="0 0 100 100" fill="currentColor">
              <polygon points="50,15 15,35 15,47 50,27 85,47 85,35" />
              <polygon points="50,33 15,53 15,65 50,45 85,65 85,53" />
              <polygon points="50,51 15,71 15,83 50,63 85,83 85,71" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-100 animate-fade-in">
            {isSignUp ? 'Create Account' : 'Sign In'}
          </h1>
          <p className="text-xs text-neutral-500">
            {isSignUp ? 'Enter your details to register.' : 'Enter your Username and 4-digit PIN.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username Field */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block mb-1">
              Username
            </label>
            <input 
              type="text" 
              placeholder="e.g. madan" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-neutral-950/60 border border-neutral-800 text-sm text-neutral-100 rounded-xl px-4 py-3 outline-none focus:border-neutral-700 transition-colors placeholder:text-neutral-600"
              required
              autoFocus
            />
          </div>

          {/* 4-digit PIN Field */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block mb-1">
              4-Digit PIN
            </label>
            <input 
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              placeholder="••••" 
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              className="w-full bg-neutral-950/60 border border-neutral-800 text-sm text-neutral-100 rounded-xl px-4 py-3 outline-none focus:border-neutral-700 transition-colors placeholder:text-neutral-600 text-center tracking-[1em] font-mono"
              required
            />
          </div>

          {/* Error messages */}
          <AnimatePresence mode="wait">
            {(validationError || authError) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="text-[11px] text-red-500 bg-red-950/20 border border-red-900/50 rounded-xl p-3 text-center leading-relaxed"
              >
                {validationError || authError}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit Button */}
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-white text-black py-3.5 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-neutral-200 active:scale-[0.98] transition-all disabled:opacity-40 flex items-center justify-center"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : isSignUp ? (
              'Register & Start'
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Toggle between Login and Signup */}
        <div className="text-center pt-2">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setValidationError(null);
            }}
            className="text-xs text-neutral-400 hover:text-neutral-200 transition-colors underline decoration-neutral-600 hover:decoration-neutral-400"
          >
            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
