'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/AuthContext';
import {
  joinQueue,
  listenToMatch,
  type PlayerInfo,
  type MatchData,
} from '@/lib/realtimeService';
import { getStars } from '@/lib/realtimeService';

interface PvPLobbyProps {
  gameType: 'match' | 'quiz';
  onMatchStart: (matchId: string, matchData: MatchData, myId: string) => void;
  onCancel: () => void;
}

export default function PvPLobby({ gameType, onMatchStart, onCancel }: PvPLobbyProps) {
  const { user } = useAuth();
  const [status, setStatus] = useState<'idle' | 'searching' | 'found'>('idle');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [opponent, setOpponent] = useState<PlayerInfo | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startSearching = async () => {
    if (!user) return;
    
    setStatus('searching');
    setElapsedSeconds(0);

    // Start elapsed timer
    timerRef.current = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);

    const stars = await getStars(user.uid);
    const myInfo: PlayerInfo = {
      odId: user.uid,
      displayName: user.displayName || 'Ẩn danh',
      photoURL: user.photoURL || '',
      stars,
    };

    cleanupRef.current = joinQueue(
      gameType,
      myInfo,
      (matchId, matchData) => {
        // Found a match!
        if (timerRef.current) clearInterval(timerRef.current);
        
        const opponentId = Object.keys(matchData.players).find(id => id !== user.uid);
        if (opponentId) {
          setOpponent(matchData.players[opponentId]);
        }
        setStatus('found');

        // Start game after short delay to show opponent
        setTimeout(() => {
          onMatchStart(matchId, matchData, user.uid);
        }, 2000);
      },
      () => {
        // Still waiting
      },
    );
  };

  const cancelSearch = () => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setStatus('idle');
    setElapsedSeconds(0);
    onCancel();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cleanupRef.current) cleanupRef.current();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const formatElapsed = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const gameName = gameType === 'match' ? 'Nối Khái Niệm' : 'Trắc Nghiệm Nhanh';

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-16 max-w-md mx-auto text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 border-2 border-primary/20">
          <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <p className="text-text-secondary font-bold text-sm">Vui lòng đăng nhập để chơi PvP</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-8 max-w-lg mx-auto">
      <AnimatePresence mode="wait">
        {status === 'idle' && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center w-full"
          >
            <div className="w-24 h-24 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-6 border-2 border-primary/20">
              <svg className="w-12 h-12 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-black text-primary-dark mb-2">Chế Độ Đối Kháng</h2>
            <p className="text-text-secondary text-sm mb-8 max-w-xs mx-auto">
              Thi đấu {gameName} với người chơi khác. Ai hoàn thành trước sẽ chiến thắng!
            </p>
            <button
              onClick={startSearching}
              className="px-10 py-4 bg-primary text-white font-black text-lg rounded-xl border-2 border-primary-dark shadow-[4px_4px_0_#2D3436] hover:-translate-y-1 hover:shadow-[6px_6px_0_#2D3436] transition-all"
            >
              Ghép Cặp Ngẫu Nhiên
            </button>
          </motion.div>
        )}

        {status === 'searching' && (
          <motion.div
            key="searching"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="text-center w-full"
          >
            <div className="relative w-28 h-28 mx-auto mb-6">
              {/* Pulsing ring animation */}
              <motion.div
                className="absolute inset-0 rounded-full border-4 border-primary/30"
                animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <motion.div
                className="absolute inset-0 rounded-full border-4 border-primary/20"
                animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
                transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
              />
              <div className="w-28 h-28 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center">
                <motion.svg
                  className="w-12 h-12 text-primary"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </motion.svg>
              </div>
            </div>

            <h2 className="text-xl font-black text-primary-dark mb-1">Đang tìm đối thủ...</h2>
            <div className="text-3xl font-black text-primary mb-6 tabular-nums">
              {formatElapsed(elapsedSeconds)}
            </div>
            
            <div className="bg-white border-2 border-border rounded-xl p-4 mb-6 max-w-xs mx-auto">
              <p className="text-xs text-text-secondary">Hệ thống đang tìm kiếm người chơi phù hợp. Vui lòng chờ trong giây lát.</p>
            </div>

            <button
              onClick={cancelSearch}
              className="px-8 py-3 bg-white text-text-secondary font-bold rounded-xl border-2 border-border hover:border-red-300 hover:text-red-500 transition-all text-sm"
            >
              Hủy tìm kiếm
            </button>
          </motion.div>
        )}

        {status === 'found' && opponent && (
          <motion.div
            key="found"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center w-full"
          >
            <h2 className="text-xl font-black text-primary-dark mb-8">Đã tìm thấy đối thủ!</h2>
            
            <div className="flex items-center justify-center gap-6 mb-8">
              {/* My avatar */}
              <motion.div
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="flex flex-col items-center"
              >
                <img
                  src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'U')}&background=6C5CE7&color=fff`}
                  alt="Bạn"
                  className="w-16 h-16 rounded-full border-4 border-primary shadow-lg mb-2"
                />
                <span className="text-sm font-black text-primary-dark truncate max-w-[100px]">
                  {user.displayName || 'Bạn'}
                </span>
              </motion.div>

              {/* VS */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4, type: 'spring' }}
                className="w-14 h-14 rounded-full bg-red-500 border-2 border-red-800 shadow-[3px_3px_0_#991B1B] flex items-center justify-center"
              >
                <span className="text-white font-black text-lg">VS</span>
              </motion.div>

              {/* Opponent avatar */}
              <motion.div
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="flex flex-col items-center"
              >
                <img
                  src={opponent.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(opponent.displayName)}&background=E17055&color=fff`}
                  alt={opponent.displayName}
                  className="w-16 h-16 rounded-full border-4 border-red-400 shadow-lg mb-2"
                />
                <span className="text-sm font-black text-red-700 truncate max-w-[100px]">
                  {opponent.displayName}
                </span>
              </motion.div>
            </div>

            <motion.p
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="text-text-secondary font-bold text-sm"
            >
              Chuẩn bị bắt đầu...
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
