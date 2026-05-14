'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/AuthContext';
import {
  listenForChallenges,
  acceptChallenge,
  declineChallenge,
  type ChallengeData,
  type PlayerInfo,
  getStars,
} from '@/lib/realtimeService';
import { useRouter } from 'next/navigation';

export default function ChallengeNotification() {
  const { user } = useAuth();
  const router = useRouter();
  const [challenge, setChallenge] = useState<{ id: string; data: ChallengeData } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!user) return;

    const unsub = listenForChallenges(user.uid, (challengeId, data) => {
      // Show only the latest pending challenge
      setChallenge({ id: challengeId, data });
    });

    return unsub;
  }, [user]);

  const handleAccept = async () => {
    if (!challenge || !user || isProcessing) return;
    setIsProcessing(true);

    try {
      const stars = await getStars(user.uid);
      const myInfo: PlayerInfo = {
        odId: user.uid,
        displayName: user.displayName || 'Ẩn danh',
        photoURL: user.photoURL || '',
        stars,
      };

      const matchId = await acceptChallenge(challenge.id, myInfo);
      setChallenge(null);
      
      // Navigate to minigame with match params
      const gameType = challenge.data.gameType;
      router.push(`/minigame?pvp=${gameType}&matchId=${matchId}`);
    } catch (err) {
      console.error('Error accepting challenge:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDecline = async () => {
    if (!challenge || isProcessing) return;
    setIsProcessing(true);

    try {
      await declineChallenge(challenge.id);
      setChallenge(null);
    } catch (err) {
      console.error('Error declining challenge:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const gameName = challenge?.data.gameType === 'match' ? 'Nối Khái Niệm' : 'Trắc Nghiệm Nhanh';

  return (
    <AnimatePresence>
      {challenge && (
        <motion.div
          initial={{ opacity: 0, y: -100, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: -100, x: '-50%' }}
          className="fixed top-20 left-1/2 z-[100] w-[360px] max-w-[90vw]"
        >
          <div className="bg-white border-2 border-primary-dark rounded-2xl shadow-[6px_6px_0_#2D3436] p-5 relative overflow-hidden">
            {/* Decorative top bar */}
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary via-amber-400 to-red-400" />
            
            <div className="flex items-center gap-3 mb-4">
              <img
                src={challenge.data.from.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(challenge.data.from.displayName)}&background=6C5CE7&color=fff`}
                alt={challenge.data.from.displayName}
                className="w-11 h-11 rounded-full border-2 border-primary shadow-md"
              />
              <div className="flex-1 min-w-0">
                <p className="font-black text-primary-dark text-sm truncate">
                  {challenge.data.from.displayName}
                </p>
                <p className="text-xs text-text-secondary">
                  Thách đấu bạn chơi <strong>{gameName}</strong>
                </p>
              </div>
              <div className="flex items-center gap-1 text-amber-600 text-xs font-bold">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                {challenge.data.from.stars}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleDecline}
                disabled={isProcessing}
                className="flex-1 px-4 py-2.5 bg-white border-2 border-border text-text-secondary font-bold rounded-xl text-sm hover:border-red-300 hover:text-red-500 transition-all disabled:opacity-50"
              >
                Từ chối
              </button>
              <button
                onClick={handleAccept}
                disabled={isProcessing}
                className="flex-1 px-4 py-2.5 bg-primary border-2 border-primary-dark text-white font-black rounded-xl text-sm shadow-[3px_3px_0_#2D3436] hover:-translate-y-0.5 transition-all disabled:opacity-50"
              >
                Chấp nhận
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
