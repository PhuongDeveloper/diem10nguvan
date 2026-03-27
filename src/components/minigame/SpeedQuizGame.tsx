'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
}

export default function SpeedQuizGame() {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [gameState, setGameState] = useState<'playing' | 'end'>('playing');
  const [isLoading, setIsLoading] = useState(true);

  const fetchQuiz = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/minigame', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'quiz' })
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setQuestions(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
      setCurrentIndex(0);
      setGameState('playing');
    }
  }, []);

  useEffect(() => {
    fetchQuiz();
    setScore(0);
  }, [fetchQuiz]);

  const handleAnswer = (selectedIndex: number) => {
    if (questions.length === 0) return;
    const isCorrect = selectedIndex === questions[currentIndex].correct;
    if (isCorrect) setScore(s => s + 10);

    setTimeout(() => {
      if (currentIndex + 1 < questions.length) {
        setCurrentIndex(prev => prev + 1);
      } else {
        setGameState('end');
      }
    }, 400);
  };

  const restart = () => {
    setScore(0);
    fetchQuiz();
  };

  if (isLoading) {
    return (
      <div className="flex flex-col max-w-xl mx-auto w-full animate-pulse">
        <div className="flex justify-between items-end mb-6">
          <div className="h-6 w-40 bg-gray-200 rounded-lg"></div>
          <div className="h-8 w-24 bg-gray-200 rounded-lg"></div>
        </div>

        <div className="bg-gray-100 border-4 border-gray-200 rounded-2xl p-6 mb-8 h-32 flex flex-col justify-center">
          <div className="h-4 w-1/4 bg-gray-300 rounded mb-4"></div>
          <div className="h-6 w-3/4 bg-gray-300 rounded mb-2"></div>
          <div className="h-6 w-1/2 bg-gray-300 rounded"></div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-gray-100 border-2 border-gray-200 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  if (gameState === 'end') {
    return (
      <div className="flex flex-col items-center bg-white border-4 border-primary-dark rounded-2xl p-8 max-w-md mx-auto text-center shadow-[8px_8px_0_#2D3436]">
        <div className="text-5xl mb-4">🏆</div>
        <h2 className="text-2xl font-black text-primary-dark mb-2">Hoàn Thành!</h2>
        <p className="text-lg text-text-secondary mb-6">Bạn đạt <strong className="text-2xl text-primary">{score}</strong> / {questions.length * 10} điểm.</p>
        <button
          onClick={restart}
          className="w-full px-6 py-3 bg-primary text-white font-black rounded-xl border-2 border-primary-dark shadow-[4px_4px_0_#2D3436] hover:-translate-y-1 transition-transform"
        >
          Chơi Lại Bàn Mới
        </button>
      </div>
    );
  }

  if (questions.length === 0) return null;

  const currentQ = questions[currentIndex];

  return (
    <div className="flex flex-col max-w-xl mx-auto w-full">
      <div className="flex justify-between items-end mb-6">
        <h2 className="text-lg font-black text-primary-dark">Trắc Nghiệm Nhanh</h2>
        <div className="text-sm font-bold bg-amber-100 text-amber-800 px-3 py-1 rounded-lg border-2 border-amber-500 shadow-[2px_2px_0_#F59E0B]">
          ĐIỂM: {score}
        </div>
      </div>

      <div className="bg-white border-4 border-primary-dark rounded-2xl p-6 shadow-[6px_6px_0_#2D3436] mb-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 bg-primary-dark text-white text-xs font-black px-3 py-1 rounded-br-lg">
          Câu {currentIndex + 1} / {questions.length}
        </div>
        <p className="text-xl font-bold text-text-primary mt-4 mb-2 leading-relaxed">
          {currentQ.question}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {currentQ.options.map((opt, i) => (
          <button
            key={i}
            onClick={() => handleAnswer(i)}
            className="p-4 bg-white border-2 border-border rounded-xl font-bold text-text-secondary text-left hover:border-primary hover:text-primary hover:shadow-[4px_4px_0_#9DC183] hover:-translate-y-1 transition-all"
          >
            <span className="inline-block bg-gray-100 rounded md px-2 py-0.5 mr-2 text-xs text-gray-500">
              {['A', 'B', 'C', 'D'][i]}
            </span>
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
