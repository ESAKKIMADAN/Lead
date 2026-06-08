'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { type Profile, type Ego } from '@/lib/db';

interface CheckInProps {
  profile: Profile;
  ego: Ego;
  onComplete: () => void;
}

export default function DailyCheckIn({ profile, ego, onComplete }: CheckInProps) {
  const [phase, setPhase] = useState<'loading' | 'question' | 'answering' | 'responding' | 'done'>('loading');
  const [question, setQuestion] = useState('');
  const [comment, setComment] = useState('');
  const [answer, setAnswer] = useState<'yes' | 'no' | null>(null);
  const [leadResponse, setLeadResponse] = useState('');
  const [pendingAnswer, setPendingAnswer] = useState<'yes' | 'no' | null>(null);

  useEffect(() => {
    fetchQuestion();
  }, []);

  const fetchQuestion = async () => {
    setPhase('loading');
    try {
      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userName: profile.name,
          goal: ego.goal,
          reason: ego.reason,
          category: ego.category,
        }),
      });
      const data = await res.json();
      setQuestion(data.question);
      setPhase('question');
    } catch {
      setQuestion(`${profile.name}, did you take action on your goal today?`);
      setPhase('question');
    }
  };

  const handleAnswer = async (selectedAnswer: 'yes' | 'no') => {
    setAnswer(selectedAnswer);
    setPendingAnswer(selectedAnswer);
    setPhase('answering');
  };

  const handleSubmit = async () => {
    if (!pendingAnswer) return;
    setPhase('responding');
    try {
      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userName: profile.name,
          goal: ego.goal,
          reason: ego.reason,
          category: ego.category,
          answer: pendingAnswer,
          comment,
          question,
        }),
      });
      const data = await res.json();
      setLeadResponse(data.response);
      setPhase('done');
    } catch {
      setLeadResponse(`Good. Keep going, ${profile.name}. Every day is a choice.`);
      setPhase('done');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }}>
      
      <AnimatePresence mode="wait">

        {/* LOADING */}
        {phase === 'loading' && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="text-center space-y-4"
          >
            <div className="text-5xl animate-pulse">⚡</div>
            <p className="text-white/60 uppercase tracking-widest text-sm font-bold">LEAD is watching...</p>
          </motion.div>
        )}

        {/* QUESTION PHASE */}
        {(phase === 'question' || phase === 'answering') && (
          <motion.div
            key="question"
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="w-full max-w-lg"
          >
            {/* AXIS header */}
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
                <span className="text-black font-black text-sm">LD</span>
              </div>
              <div>
                <p className="text-white font-black uppercase tracking-widest text-xs">LEAD</p>
                <p className="text-white/40 text-xs uppercase tracking-wider">Daily Accountability Check</p>
              </div>
            </div>

            {/* Question bubble */}
            <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm p-6 mb-6">
              <p className="text-white text-xl font-light leading-relaxed">{question}</p>
            </div>

            {/* YES / NO buttons */}
            {phase === 'question' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="grid grid-cols-2 gap-4"
              >
                <button
                  id="checkin-yes-btn"
                  onClick={() => handleAnswer('yes')}
                  className="group relative overflow-hidden bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-400 py-5 rounded-2xl font-black text-lg uppercase tracking-widest hover:bg-emerald-500/20 hover:border-emerald-400 transition-all duration-200 hover:scale-[1.02]"
                >
                  <span className="relative z-10">✅ Yes</span>
                </button>
                <button
                  id="checkin-no-btn"
                  onClick={() => handleAnswer('no')}
                  className="group relative overflow-hidden bg-red-500/10 border-2 border-red-500/30 text-red-400 py-5 rounded-2xl font-black text-lg uppercase tracking-widest hover:bg-red-500/20 hover:border-red-400 transition-all duration-200 hover:scale-[1.02]"
                >
                  <span className="relative z-10">❌ No</span>
                </button>
              </motion.div>
            )}

            {/* Comment + Submit after answering */}
            {phase === 'answering' && (
              <motion.div
                key="comment"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                {/* Show chosen answer */}
                <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
                  pendingAnswer === 'yes'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-red-500/10 border-red-500/30 text-red-400'
                }`}>
                  <span className="text-xl">{pendingAnswer === 'yes' ? '✅' : '❌'}</span>
                  <span className="font-bold uppercase tracking-wider text-sm">
                    {pendingAnswer === 'yes' ? 'You said YES' : 'You said NO'}
                  </span>
                  <button
                    onClick={() => { setPhase('question'); setAnswer(null); setPendingAnswer(null); }}
                    className="ml-auto text-white/30 hover:text-white/60 text-xs"
                  >
                    change
                  </button>
                </div>

                {/* Comment box */}
                <div className="relative">
                  <textarea
                    id="checkin-comment"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Add more context... (optional)"
                    rows={3}
                    className="w-full bg-white/5 border border-white/10 text-white placeholder-white/30 rounded-xl px-5 py-4 outline-none focus:border-white/30 resize-none transition-colors text-sm leading-relaxed"
                  />
                </div>

                {/* Submit */}
                <button
                  id="checkin-submit-btn"
                  onClick={handleSubmit}
                  className="w-full bg-white text-black py-4 rounded-xl font-black uppercase tracking-widest text-sm hover:bg-white/90 transition-colors"
                >
                  Submit to LEAD →
                </button>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* RESPONDING - loading */}
        {phase === 'responding' && (
          <motion.div
            key="responding"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="text-center space-y-4"
          >
            <div className="text-5xl animate-bounce">🎯</div>
            <p className="text-white/60 uppercase tracking-widest text-sm font-bold">LEAD is processing...</p>
          </motion.div>
        )}

        {/* AXIS RESPONSE */}
        {phase === 'done' && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="w-full max-w-lg"
          >
            {/* AXIS header */}
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
                <span className="text-black font-black text-sm">LD</span>
              </div>
              <div>
                <p className="text-white font-black uppercase tracking-widest text-xs">LEAD</p>
                <p className="text-white/40 text-xs uppercase tracking-wider">Response</p>
              </div>
            </div>

            {/* Answer badge */}
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 border text-sm font-bold uppercase tracking-wider ${
              answer === 'yes'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}>
              {answer === 'yes' ? '✅ You showed up' : '❌ You missed today'}
            </div>

            {/* AXIS response text */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm p-6 mb-8"
            >
              <p className="text-white text-lg leading-relaxed font-light">{leadResponse}</p>
            </motion.div>

            {/* Continue button */}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              id="checkin-continue-btn"
              onClick={onComplete}
              className="w-full bg-white text-black py-4 rounded-xl font-black uppercase tracking-widest text-sm hover:bg-white/90 transition-colors"
            >
              Let's get to work →
            </motion.button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
