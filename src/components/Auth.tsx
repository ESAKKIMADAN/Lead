'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSupabase } from '@/lib/SupabaseContext';

export default function Auth() {
  const { signIn, signUp, resetPin, getEmailByUsername, authError } = useSupabase();
  
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPin, setIsForgotPin] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const getGeneratedEmail = (userStr: string) => {
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

    if (isSignUp) {
      const cleanEmail = email.trim();
      if (!cleanEmail || !cleanEmail.includes('@')) {
        setValidationError('Please enter a valid email address.');
        return false;
      }
    }

    if (!isForgotPin && !/^\d{4}$/.test(pin)) {
      setValidationError('PIN must be exactly 4 digits (numbers only).');
      return false;
    }

    return true;
  };

  const handleForgotPin = async () => {
    setLoading(true);
    setValidationError(null);
    const cleanUsername = username.trim();
    if (!cleanUsername) {
      setValidationError('Please enter a username.');
      setLoading(false);
      return;
    }
    const realEmail = await getEmailByUsername(cleanUsername);
    if (!realEmail) {
      setValidationError('Username not found.');
      setLoading(false);
      return;
    }
    const success = await resetPin(realEmail);
    if (success) {
      setResetSent(true);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isForgotPin) {
      await handleForgotPin();
      return;
    }

    if (!validateForm()) return;

    setLoading(true);
    const cleanUsername = username.trim();
    let success = false;

    if (isSignUp) {
      const cleanEmail = email.trim();
      success = await signUp(cleanEmail, cleanUsername, pin);
      if (success) {
        await signIn(cleanEmail, pin);
      }
    } else {
      const realEmail = await getEmailByUsername(cleanUsername);
      if (!realEmail) {
        setValidationError('Username not found. Please register.');
        setLoading(false);
        return;
      }
      success = await signIn(realEmail, pin);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 flex flex-col justify-center">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-[400px] mx-auto space-y-8"
      >
        <div className="flex flex-col items-start space-y-2">
          <h1 className="text-5xl font-bold tracking-tight text-white animate-fade-in">
            {isForgotPin ? 'Reset PIN' : isSignUp ? 'Create Account' : 'Sign In'}
          </h1>
          <p className="text-sm text-white/50 font-medium pt-1">
            {isForgotPin 
              ? 'Enter your Username to receive a reset link.'
              : isSignUp 
                ? 'Enter your details to register.' 
                : 'Enter your Username and 4-digit PIN.'}
          </p>
        </div>

        {resetSent ? (
          <div className="text-center space-y-6 animate-fade-in mt-8">
            <div className="text-sm font-medium text-green-400 bg-green-500/10 p-6 rounded-[2rem] border border-green-500/20">
              A reset link has been sent to the email registered with this username! Check your inbox.
            </div>
            <button
              onClick={() => {
                setIsForgotPin(false);
                setResetSent(false);
              }}
              className="text-sm font-semibold text-white/50 hover:text-white transition-colors underline decoration-white/20 hover:decoration-white underline-offset-4"
            >
              Back to Sign In
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 mt-8">
          {/* Username Field */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 block pl-4">
              Username
            </label>
            <input 
              type="text" 
              placeholder="e.g. madan" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-[#1A1A1A] text-lg text-white rounded-[2rem] px-6 py-5 outline-none focus:bg-[#222] transition-colors placeholder:text-white/20 font-medium"
              required
              autoFocus
            />
          </div>

          {/* Email Field (Only for Sign Up) */}
          <AnimatePresence>
            {isSignUp && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-5 space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 block pl-4">
                    Email
                  </label>
                  <input 
                    type="email" 
                    placeholder="e.g. madan@example.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#1A1A1A] text-lg text-white rounded-[2rem] px-6 py-5 outline-none focus:bg-[#222] transition-colors placeholder:text-white/20 font-medium"
                    required={isSignUp}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 4-digit PIN Field */}
          <AnimatePresence>
            {!isForgotPin && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-5 space-y-2">
                  <div className="flex justify-between items-center pl-4 pr-4">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 block">
                      4-Digit PIN
                    </label>
                    {!isSignUp && (
                      <button
                        type="button"
                        onClick={() => setIsForgotPin(true)}
                        className="text-[10px] font-bold uppercase tracking-widest text-white/50 hover:text-white transition-colors"
                      >
                        Forgot PIN?
                      </button>
                    )}
                  </div>
                  <input 
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    placeholder="••••" 
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-[#1A1A1A] text-2xl text-white rounded-[2rem] px-6 py-5 outline-none focus:bg-[#222] transition-colors placeholder:text-white/20 text-center tracking-[1em] font-mono"
                    required={!isForgotPin}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error messages */}
          <AnimatePresence mode="wait">
            {(validationError || authError) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="pt-4"
              >
                <div className="text-xs font-medium text-[#FF6B6B] bg-[#FF6B6B]/10 border border-[#FF6B6B]/20 rounded-[2rem] p-4 text-center leading-relaxed">
                  {validationError || authError}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit Button */}
          <div className="pt-6">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-card-yellow text-black py-5 rounded-full font-bold uppercase tracking-widest text-sm hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-40 flex items-center justify-center"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : isForgotPin ? (
                'Send Reset Link'
              ) : isSignUp ? (
                'Register & Start'
              ) : (
                'Sign In'
              )}
            </button>
          </div>
        </form>
        )}

        {/* Toggle between Login and Signup */}
        {!resetSent && (
          <div className="text-center pt-8">
            <button
              type="button"
              onClick={() => {
                if (isForgotPin) {
                  setIsForgotPin(false);
                } else {
                  setIsSignUp(!isSignUp);
                }
                setValidationError(null);
              }}
              className="text-xs font-bold uppercase tracking-widest text-white/50 hover:text-white transition-colors"
            >
              {isForgotPin 
                ? 'Back to Sign In'
                : isSignUp 
                  ? 'Already have an account? Sign In' 
                  : "Don't have an account? Sign Up"}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
