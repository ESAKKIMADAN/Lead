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
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-[400px] bg-card text-card-foreground border border-border rounded-[2.5rem] p-8 shadow-sm space-y-6"
      >
        <div className="flex flex-col items-center text-center space-y-2">
          {/* Logo */}
          <div className="w-12 h-12 flex items-center justify-center text-primary mb-2">
            <svg width="28" height="28" viewBox="0 0 100 100" fill="currentColor">
              <polygon points="50,15 15,35 15,47 50,27 85,47 85,35" />
              <polygon points="50,33 15,53 15,65 50,45 85,65 85,53" />
              <polygon points="50,51 15,71 15,83 50,63 85,83 85,71" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-primary animate-fade-in">
            {isForgotPin ? 'Reset PIN' : isSignUp ? 'Create Account' : 'Sign In'}
          </h1>
          <p className="text-sm text-muted-foreground font-medium">
            {isForgotPin 
              ? 'Enter your Username to receive a reset link.'
              : isSignUp 
                ? 'Enter your details to register.' 
                : 'Enter your Username and 4-digit PIN.'}
          </p>
        </div>

        {resetSent ? (
          <div className="text-center space-y-4 animate-fade-in">
            <div className="text-sm font-medium text-green-700 bg-green-500/10 p-4 rounded-2xl border border-green-500/20 dark:text-green-400">
              A reset link has been sent to the email registered with this username! Check your inbox.
            </div>
            <button
              onClick={() => {
                setIsForgotPin(false);
                setResetSent(false);
              }}
              className="text-sm font-semibold text-muted-foreground hover:text-primary transition-colors underline decoration-border hover:decoration-primary underline-offset-4"
            >
              Back to Sign In
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username Field */}
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1 pl-1">
              Username
            </label>
            <input 
              type="text" 
              placeholder="e.g. madan" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-background border border-border text-base text-foreground rounded-2xl px-5 py-4 outline-none focus:border-primary transition-colors placeholder:text-muted-foreground font-medium shadow-sm"
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
                className="space-y-1 overflow-hidden"
              >
                <div className="pt-2 space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1 pl-1">
                    Email
                  </label>
                  <input 
                    type="email" 
                    placeholder="e.g. madan@example.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-background border border-border text-base text-foreground rounded-2xl px-5 py-4 outline-none focus:border-primary transition-colors placeholder:text-muted-foreground font-medium shadow-sm"
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
                className="space-y-1 overflow-hidden"
              >
                <div className="pt-2 space-y-1">
                  <div className="flex justify-between items-center mb-1 pl-1 pr-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                      4-Digit PIN
                    </label>
                    {!isSignUp && (
                      <button
                        type="button"
                        onClick={() => setIsForgotPin(true)}
                        className="text-xs font-semibold text-muted-foreground hover:text-primary transition-colors"
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
                    className="w-full bg-background border border-border text-lg text-foreground rounded-2xl px-5 py-4 outline-none focus:border-primary transition-colors placeholder:text-muted-foreground text-center tracking-[1em] font-mono shadow-sm"
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
                className="text-xs font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-2xl p-4 text-center leading-relaxed"
              >
                {validationError || authError}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit Button */}
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-bold uppercase tracking-widest text-xs hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-40 flex items-center justify-center shadow-md"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : isForgotPin ? (
              'Send Reset Link'
            ) : isSignUp ? (
              'Register & Start'
            ) : (
              'Sign In'
            )}
          </button>
        </form>
        )}

        {/* Toggle between Login and Signup */}
        {!resetSent && (
          <div className="text-center pt-3">
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
              className="text-sm font-semibold text-muted-foreground hover:text-primary transition-colors underline decoration-border hover:decoration-primary underline-offset-4"
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
