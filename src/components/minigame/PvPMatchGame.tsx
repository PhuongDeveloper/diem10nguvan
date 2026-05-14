'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/AuthContext';
import FeedbackOverlay from './FeedbackOverlay';
import PvPLobby from './PvPLobby';
import {
  type MatchData,
  listenToMatch,
  setGameData,
  updateProgress,
  finishMatch,
  updateStars,
  cleanupMatch,
} from '@/lib/realtimeService';

interface Pair {
  concept: string;
  description: string;
}

type GamePhase = 'lobby' | 'loading' | 'playing' | 'finished';

export default function PvPMatchGame() {
  const { user } = useAuth();
  const [phase, setPhase] = useState<GamePhase>('lobby');
  const [matchId, setMatchId] = useState<string | null>(null);
  const [matchData, setMatchData] = useState<MatchData | null>(null);
  const [myId, setMyId] = useState<string>('');

  // Game state
  const [items, setItems] = useState<{ id: string; text: string; type: 'concept' | 'description'; matched: boolean }[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [matchedCount, setMatchedCount] = useState(0);
  const [totalPairs, setTotalPairs] = useState(0);
  const [feedbackType, setFeedbackType] = useState<'correct' | 'incorrect' | null>(null);
  const [gameResult, setGameResult] = useState<'win' | 'lose' | null>(null);
  const [opponentProgress, setOpponentProgress] = useState({ completed: 0, total: 0 });
  const [starDelta, setStarDelta] = useState(0);
  const gameFinishedRef = useRef(false);

  // Handle match found from lobby
  const handleMatchStart = useCallback(async (mId: string, mData: MatchData, uid: string) => {
    setMatchId(mId);
    setMatchData(mData);
    setMyId(uid);
    setPhase('loading');

    // First player fetches game data
    const playerIds = Object.keys(mData.players);
    const isFirstPlayer = playerIds.sort()[0] === uid;

    if (isFirstPlayer) {
      try {
        const res = await fetch('/api/minigame', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'match' }),
        });
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          // Only take first 8 pairs for PvP (manageable size)
          const pairs = data.data.slice(0, 8);
          await setGameData(mId, pairs);
        }
      } catch (e) {
        console.error('Failed to fetch game data:', e);
      }
    }
  }, []);

  // Listen to match updates
  useEffect(() => {
    if (!matchId) return;

    const unsub = listenToMatch(matchId, (data) => {
      if (!data) return;
      setMatchData(data);

      // Game data is ready, start playing
      if (data.gameData && data.status === 'playing' && phase === 'loading') {
        const pairsRaw = Array.isArray(data.gameData) ? data.gameData : Object.values(data.gameData);
        const pairs = pairsRaw as Pair[];
        setTotalPairs(pairs.length);
        setMatchedCount(0);
        
        const gameItems = pairs.flatMap((pair, idx) => [
          { id: `c_${idx}`, text: pair.concept, type: 'concept' as const, matched: false },
          { id: `d_${idx}`, text: pair.description, type: 'description' as const, matched: false },
        ]).sort(() => Math.random() - 0.5);
        
        setItems(gameItems);
        setPhase('playing');
      }

      // Update opponent progress
      if (data.progress && myId) {
        const opponentId = Object.keys(data.players).find(id => id !== myId);
        if (opponentId && data.progress[opponentId]) {
          setOpponentProgress(data.progress[opponentId]);
        }
      }

      // Check if game finished by other player
      if (data.status === 'finished' && data.result && !gameFinishedRef.current) {
        gameFinishedRef.current = true;
        if (data.result.winner === myId) {
          setGameResult('win');
          setStarDelta(1);
          updateStars(myId, 1);
        } else {
          setGameResult('lose');
          setStarDelta(-1);
          updateStars(myId, -1);
        }
        setPhase('finished');
      }
    });

    return unsub;
  }, [matchId, phase, myId]);

  // Handle card selection
  const handleSelect = (id: string) => {
    if (selectedIds.length === 2 || phase !== 'playing') return;
    const item = items.find(i => i.id === id);
    if (!item || item.matched || selectedIds.includes(id)) return;

    const newSelected = [...selectedIds, id];
    setSelectedIds(newSelected);

    if (newSelected.length === 2) {
      const [id1, id2] = newSelected;
      const index1 = parseInt(id1.split('_')[1]);
      const index2 = parseInt(id2.split('_')[1]);
      const type1 = id1.split('_')[0];
      const type2 = id2.split('_')[0];

      if (index1 === index2 && type1 !== type2) {
        setFeedbackType('correct');
        setTimeout(() => {
          setItems(prev => prev.map(i => (i.id === id1 || i.id === id2) ? { ...i, matched: true } : i));
          setSelectedIds([]);
          const newCount = matchedCount + 1;
          setMatchedCount(newCount);
          
          // Update progress in RTDB
          if (matchId) {
            updateProgress(matchId, myId, newCount, totalPairs);
          }

          // Check if I completed all pairs
          if (newCount >= totalPairs && !gameFinishedRef.current) {
            gameFinishedRef.current = true;
            finishMatch(matchId!, myId).then((result) => {
              if (result?.won) {
                setGameResult('win');
                setStarDelta(1);
                updateStars(myId, 1);
              } else {
                setGameResult('lose');
                setStarDelta(-1);
                updateStars(myId, -1);
              }
              setPhase('finished');
              cleanupMatch(matchId!);
            });
          }
        }, 400);
      } else {
        setFeedbackType('incorrect');
        setTimeout(() => {
          setSelectedIds([]);
          setFeedbackType(null);
        }, 600);
      }
    }
  };

  const resetGame = () => {
    setPhase('lobby');
    setMatchId(null);
    setMatchData(null);
    setItems([]);
    setSelectedIds([]);
    setMatchedCount(0);
    setTotalPairs(0);
    setGameResult(null);
    setStarDelta(0);
    gameFinishedRef.current = false;
  };

  // Get opponent info
  const opponent = matchData
    ? Object.values(matchData.players).find(p => p.odId !== myId)
    : null;

  if (phase === 'lobby') {
    return <PvPLobby gameType="match" onMatchStart={handleMatchStart} onCancel={() => {}} />;
  }

  if (phase === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center py-16 max-w-md mx-auto">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full mb-6"
        />
        <h2 className="text-lg font-black text-primary-dark mb-2">Đang chuẩn bị trận đấu...</h2>
        <p className="text-sm text-text-secondary">Tải dữ liệu câu hỏi</p>
      </div>
    );
  }

  if (phase === 'finished') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center py-10 max-w-md mx-auto"
      >
        <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 border-4 shadow-lg ${
          gameResult === 'win'
            ? 'bg-green-100 border-green-500 text-green-700'
            : 'bg-red-100 border-red-400 text-red-600'
        }`}>
          <span className="text-4xl font-black">{gameResult === 'win' ? 'W' : 'L'}</span>
        </div>

        <h2 className={`text-2xl font-black mb-2 ${
          gameResult === 'win' ? 'text-green-700' : 'text-red-600'
        }`}>
          {gameResult === 'win' ? 'Chiến Thắng!' : 'Thua Cuộc!'}
        </h2>

        <p className="text-text-secondary text-sm mb-2">
          {gameResult === 'win'
            ? 'Bạn đã hoàn thành trước đối thủ!'
            : 'Đối thủ đã hoàn thành trước bạn!'}
        </p>

        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 mb-8 font-black text-sm ${
          starDelta > 0
           ? 'bg-amber-50 border-amber-400 text-amber-700'
            : 'bg-red-50 border-red-300 text-red-600'
        }`}>
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          <span>{starDelta > 0 ? '+1' : '-1'} sao</span>
        </div>

        {opponent && (
          <div className="bg-white border-2 border-border rounded-xl p-4 w-full mb-6">
            <p className="text-xs font-bold text-text-light mb-3 uppercase tracking-wider">Kết quả trận đấu</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img
                  src={user?.photoURL || ''}
                  alt="Bạn"
                  className="w-8 h-8 rounded-full border-2 border-primary"
                />
                <span className="text-sm font-bold text-primary-dark truncate max-w-[80px]">{user?.displayName}</span>
              </div>
              <span className="font-black text-primary-dark">{matchedCount}/{totalPairs}</span>
            </div>
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-2">
                <img
                  src={opponent.photoURL || ''}
                  alt={opponent.displayName}
                  className="w-8 h-8 rounded-full border-2 border-red-400"
                />
                <span className="text-sm font-bold text-red-700 truncate max-w-[80px]">{opponent.displayName}</span>
              </div>
              <span className="font-black text-red-700">{opponentProgress.completed}/{opponentProgress.total}</span>
            </div>
          </div>
        )}

        <button
          onClick={resetGame}
          className="w-full px-6 py-3 bg-primary text-white font-black rounded-xl border-2 border-primary-dark shadow-[4px_4px_0_#2D3436] hover:-translate-y-1 transition-transform"
        >
          Chơi Lại
        </button>
      </motion.div>
    );
  }

  // Playing phase
  const myProgressPercent = totalPairs > 0 ? (matchedCount / totalPairs) * 100 : 0;
  const opponentPercent = opponentProgress.total > 0
    ? (opponentProgress.completed / opponentProgress.total) * 100
    : 0;

  return (
    <motion.div
      className="flex flex-col items-center max-w-3xl mx-auto w-full"
      animate={feedbackType === 'incorrect' ? { x: [-5, 5, -5, 5, 0] } : {}}
      transition={{ duration: 0.3 }}
    >
      <FeedbackOverlay
        type={feedbackType}
        onFinished={() => setFeedbackType(null)}
        scoreValue={10}
      />

      {/* PvP Status Bar */}
      <div className="w-full bg-white border-2 border-primary-dark rounded-xl p-4 mb-6 shadow-[4px_4px_0_#2D3436]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <img
              src={user?.photoURL || ''}
              alt="Bạn"
              className="w-8 h-8 rounded-full border-2 border-primary"
            />
            <span className="text-xs font-black text-primary-dark">Bạn</span>
          </div>
          <span className="text-xs font-bold text-text-light px-2 py-0.5 bg-gray-100 rounded">VS</span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-red-700">{opponent?.displayName || '...'}</span>
            <img
              src={opponent?.photoURL || ''}
              alt={opponent?.displayName || ''}
              className="w-8 h-8 rounded-full border-2 border-red-400"
            />
          </div>
        </div>
        
        {/* Progress bars */}
        <div className="space-y-2">
          <div>
            <div className="flex justify-between text-[10px] font-bold mb-0.5">
              <span className="text-primary-dark">Tiến trình của bạn</span>
              <span className="text-primary">{matchedCount}/{totalPairs}</span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
              <motion.div
                className="h-full bg-primary rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${myProgressPercent}%` }}
                transition={{ type: 'spring', stiffness: 100 }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-[10px] font-bold mb-0.5">
              <span className="text-red-600">Tiến trình đối thủ</span>
              <span className="text-red-500">{opponentProgress.completed}/{opponentProgress.total}</span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
              <motion.div
                className="h-full bg-red-400 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${opponentPercent}%` }}
                transition={{ type: 'spring', stiffness: 100 }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Game board */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 w-full">
        <AnimatePresence mode="popLayout">
          {items.map(item => {
            const isSelected = selectedIds.includes(item.id);
            const isMatched = item.matched;

            return (
              <motion.button
                layout
                key={item.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: isMatched ? 0.3 : 1, scale: isMatched ? 0.95 : 1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleSelect(item.id)}
                disabled={isMatched || selectedIds.length === 2}
                className={`p-3 rounded-xl border-2 text-sm min-h-[90px] transition-all flex items-center justify-center text-center ${
                  item.type === 'concept' ? 'font-black' : 'font-medium'
                } ${
                  isMatched
                    ? 'bg-green-100 border-green-400 text-green-700'
                    : isSelected
                      ? 'bg-amber-100 border-amber-500 text-amber-800 shadow-[3px_3px_0_#F59E0B]'
                      : 'bg-white border-primary-dark text-text-primary shadow-[3px_3px_0_#2D3436] hover:-translate-y-1'
                }`}
              >
                {item.text}
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
