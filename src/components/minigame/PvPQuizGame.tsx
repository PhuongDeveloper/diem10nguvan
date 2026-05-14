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

interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
}

type GamePhase = 'lobby' | 'loading' | 'playing' | 'finished';

export default function PvPQuizGame() {
  const { user } = useAuth();
  const [phase, setPhase] = useState<GamePhase>('lobby');
  const [matchId, setMatchId] = useState<string | null>(null);
  const [matchData, setMatchData] = useState<MatchData | null>(null);
  const [myId, setMyId] = useState<string>('');

  // Game state
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [feedbackType, setFeedbackType] = useState<'correct' | 'incorrect' | null>(null);
  const [gameResult, setGameResult] = useState<'win' | 'lose' | null>(null);
  const [opponentProgress, setOpponentProgress] = useState({ completed: 0, total: 0 });
  const [starDelta, setStarDelta] = useState(0);
  const gameFinishedRef = useRef(false);
  const [isAnswering, setIsAnswering] = useState(false);

  const handleMatchStart = useCallback(async (mId: string, mData: MatchData, uid: string) => {
    setMatchId(mId);
    setMatchData(mData);
    setMyId(uid);
    setPhase('loading');

    const playerIds = Object.keys(mData.players);
    const isFirstPlayer = playerIds.sort()[0] === uid;

    if (isFirstPlayer) {
      try {
        const res = await fetch('/api/minigame', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'quiz' }),
        });
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          const quizData = data.data.slice(0, 10);
          await setGameData(mId, quizData);
        }
      } catch (e) {
        console.error('Failed to fetch quiz data:', e);
      }
    }
  }, []);

  // Listen to match
  useEffect(() => {
    if (!matchId) return;

    const unsub = listenToMatch(matchId, (data) => {
      if (!data) return;
      setMatchData(data);

      if (data.gameData && data.status === 'playing' && phase === 'loading') {
        // Firebase RTDB may convert arrays to objects, so ensure it's an array
        const qs = (Array.isArray(data.gameData) ? data.gameData : Object.values(data.gameData)) as any[];
        
        // Normalize the questions to ensure they have an options array
        const normalizedQs: QuizQuestion[] = qs.map(q => ({
          question: q.question || 'Câu hỏi lỗi?',
          options: q.options || q.choices || q.answers || ['A', 'B', 'C', 'D'],
          correct: q.correct !== undefined ? q.correct : 0,
        }));
        
        setQuestions(normalizedQs);
        setCurrentIndex(0);
        setScore(0);
        setPhase('playing');
      }

      if (data.progress && myId) {
        const opponentId = Object.keys(data.players).find(id => id !== myId);
        if (opponentId && data.progress[opponentId]) {
          setOpponentProgress(data.progress[opponentId]);
        }
      }

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

  const handleAnswer = (selectedIndex: number) => {
    if (questions.length === 0 || phase !== 'playing' || isAnswering) return;
    setIsAnswering(true);

    const isCorrect = selectedIndex === questions[currentIndex].correct;
    if (isCorrect) {
      setScore(s => s + 10);
      setFeedbackType('correct');
    } else {
      setFeedbackType('incorrect');
    }

    const newCompleted = currentIndex + 1;

    // Update progress
    if (matchId) {
      updateProgress(matchId, myId, newCompleted, questions.length);
    }

    setTimeout(() => {
      setFeedbackType(null);
      setIsAnswering(false);

      if (newCompleted >= questions.length && !gameFinishedRef.current) {
        // I finished all questions
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
      } else {
        setCurrentIndex(prev => prev + 1);
      }
    }, 700);
  };

  const resetGame = () => {
    setPhase('lobby');
    setMatchId(null);
    setMatchData(null);
    setQuestions([]);
    setCurrentIndex(0);
    setScore(0);
    setGameResult(null);
    setStarDelta(0);
    gameFinishedRef.current = false;
    setIsAnswering(false);
  };

  const opponent = matchData
    ? Object.values(matchData.players).find(p => p.odId !== myId)
    : null;

  if (phase === 'lobby') {
    return <PvPLobby gameType="quiz" onMatchStart={handleMatchStart} onCancel={() => {}} />;
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
        <p className="text-sm text-text-secondary">Tải câu hỏi trắc nghiệm</p>
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
          Điểm của bạn: <strong className="text-primary">{score}/{questions.length * 10}</strong>
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
                <img src={user?.photoURL || ''} alt="Bạn" className="w-8 h-8 rounded-full border-2 border-primary" />
                <span className="text-sm font-bold text-primary-dark truncate max-w-[80px]">{user?.displayName}</span>
              </div>
              <span className="font-black text-primary-dark">{score} đ</span>
            </div>
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-2">
                <img src={opponent.photoURL || ''} alt={opponent.displayName} className="w-8 h-8 rounded-full border-2 border-red-400" />
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
  if (currentIndex >= questions.length) return null;
  const currentQ = questions[currentIndex];
  const myProgressPercent = questions.length > 0 ? ((currentIndex) / questions.length) * 100 : 0;
  const opponentPercent = opponentProgress.total > 0
    ? (opponentProgress.completed / opponentProgress.total) * 100
    : 0;

  return (
    <motion.div
      className="flex flex-col max-w-xl mx-auto w-full"
      animate={feedbackType === 'incorrect' ? { x: [-5, 5, -5, 5, 0] } : {}}
      transition={{ duration: 0.3 }}
    >
      <FeedbackOverlay
        type={feedbackType}
        onFinished={() => setFeedbackType(null)}
        scoreValue={10}
      />

      {/* PvP Status Bar */}
      <div className="bg-white border-2 border-primary-dark rounded-xl p-4 mb-6 shadow-[4px_4px_0_#2D3436]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <img src={user?.photoURL || ''} alt="Bạn" className="w-8 h-8 rounded-full border-2 border-primary" />
            <span className="text-xs font-black text-primary-dark">Bạn</span>
          </div>
          <span className="text-xs font-bold text-text-light px-2 py-0.5 bg-gray-100 rounded">VS</span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-red-700">{opponent?.displayName || '...'}</span>
            <img src={opponent?.photoURL || ''} alt={opponent?.displayName || ''} className="w-8 h-8 rounded-full border-2 border-red-400" />
          </div>
        </div>
        <div className="space-y-2">
          <div>
            <div className="flex justify-between text-[10px] font-bold mb-0.5">
              <span className="text-primary-dark">Bạn</span>
              <span className="text-primary">{currentIndex}/{questions.length}</span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
              <motion.div className="h-full bg-primary rounded-full" animate={{ width: `${myProgressPercent}%` }} transition={{ type: 'spring', stiffness: 100 }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-[10px] font-bold mb-0.5">
              <span className="text-red-600">Đối thủ</span>
              <span className="text-red-500">{opponentProgress.completed}/{opponentProgress.total}</span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
              <motion.div className="h-full bg-red-400 rounded-full" animate={{ width: `${opponentPercent}%` }} transition={{ type: 'spring', stiffness: 100 }} />
            </div>
          </div>
        </div>
      </div>

      {/* Question */}
      <div className="bg-white border-4 border-primary-dark rounded-2xl p-6 shadow-[6px_6px_0_#2D3436] mb-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 bg-primary-dark text-white text-xs font-black px-3 py-1 rounded-br-lg">
          Câu {currentIndex + 1} / {questions.length}
        </div>
        <div className="absolute top-0 right-0 bg-amber-400 text-amber-900 text-xs font-black px-3 py-1 rounded-bl-lg">
          ĐIỂM: {score}
        </div>
        <p className="text-lg font-bold text-text-primary mt-4 mb-2 leading-relaxed">
          {currentQ.question}
        </p>
      </div>

      {/* Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {(currentQ?.options || []).map((opt, i) => (
          <button
            key={i}
            onClick={() => handleAnswer(i)}
            disabled={isAnswering}
            className="p-4 bg-white border-2 border-border rounded-xl font-bold text-text-secondary text-left hover:border-primary hover:text-primary hover:shadow-[4px_4px_0_#9DC183] hover:-translate-y-1 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          >
            <span className="inline-block bg-gray-100 rounded px-2 py-0.5 mr-2 text-xs text-gray-500">
              {['A', 'B', 'C', 'D'][i]}
            </span>
            {opt}
          </button>
        ))}
      </div>
    </motion.div>
  );
}
