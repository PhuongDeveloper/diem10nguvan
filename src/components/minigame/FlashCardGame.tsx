'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import FeedbackOverlay from './FeedbackOverlay';

interface FlashCard {
  term: string;
  definition: string;
}

export default function FlashCardGame() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [cards, setCards] = useState<FlashCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [score, setScore] = useState(0);
  const [feedbackType, setFeedbackType] = useState<'correct' | 'incorrect' | null>(null);

  const fetchCards = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/minigame', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'flashcard' })
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setCards(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
      setCurrentIndex(0);
      setIsFlipped(false);
    }
  }, []);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  const handleNext = () => {
    setFeedbackType('correct');
    setScore(s => s + 5);
    
    setTimeout(() => {
      setFeedbackType(null);
      setIsFlipped(false);
      setTimeout(() => {
        if (currentIndex + 1 < cards.length) {
          setCurrentIndex((prev) => prev + 1);
        } else {
          // Fetch new batch when done
          fetchCards();
        }
      }, 150);
    }, 400);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center max-w-lg mx-auto w-full">
        <div className="text-center mb-6">
          <div className="h-7 w-48 bg-gray-200 rounded-lg animate-pulse mx-auto mb-2"></div>
          <div className="h-4 w-40 bg-gray-200 rounded-lg animate-pulse mx-auto"></div>
        </div>
        <div className="w-full relative h-[300px] bg-gray-100 rounded-2xl border-4 border-gray-200 shadow-[6px_6px_0_#E5E7EB] animate-pulse flex flex-col items-center justify-center p-6">
          <div className="h-4 w-32 bg-gray-300 rounded mb-6"></div>
          <div className="h-10 w-3/4 bg-gray-300 rounded-lg mb-4"></div>
          <div className="h-10 w-1/2 bg-gray-300 rounded-lg"></div>
        </div>
        <div className="flex items-center justify-between w-full mt-8 opacity-50">
          <div className="h-5 w-12 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-12 w-36 bg-gray-200 rounded-xl animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (cards.length === 0) return null;

  const currentCard = cards[currentIndex];

  return (
    <motion.div className="flex flex-col items-center max-w-lg mx-auto w-full">
      <FeedbackOverlay 
        type={feedbackType} 
        onFinished={() => setFeedbackType(null)} 
        scoreValue={5}
      />
      <div className="text-center mb-6">
        <h2 className="text-xl font-black text-primary-dark">Lật Thẻ Ôn Tập</h2>
        <div className="flex items-center justify-center gap-4 mt-1">
          <p className="text-sm text-text-secondary">Chạm vào thẻ để xem đáp án</p>
          <span className="text-sm font-black bg-amber-100 text-amber-800 px-2 py-0.5 rounded border border-amber-300">
            Điểm: {score}
          </span>
        </div>
      </div>

      <div className="w-full relative h-[300px] perspective-1000">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex + (isFlipped ? '-flipped' : '')}
            initial={{ opacity: 0, rotateY: isFlipped ? -90 : 90 }}
            animate={{ opacity: 1, rotateY: 0 }}
            exit={{ opacity: 0, rotateY: isFlipped ? 90 : -90 }}
            transition={{ duration: 0.2 }}
            onClick={() => setIsFlipped(!isFlipped)}
            className={`cursor-pointer absolute inset-0 w-full h-full rounded-2xl border-4 p-6 flex flex-col items-center justify-center text-center shadow-[6px_6px_0_#2D3436] ${
              isFlipped 
                ? 'bg-amber-100 border-amber-500' 
                : 'bg-white border-primary-dark'
            }`}
          >
            {isFlipped ? (
              <>
                <p className="text-xs font-black text-amber-600 uppercase mb-4 tracking-widest">ĐỊNH NGHĨA / Ý NGHĨA</p>
                <p className="text-lg text-text-primary leading-relaxed">{currentCard.definition}</p>
              </>
            ) : (
              <>
                <p className="text-xs font-black text-primary uppercase mb-4 tracking-widest">TÁC PHẨM / THUẬT NGỮ</p>
                <h3 className="text-3xl font-black text-primary-dark">{currentCard.term}</h3>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between w-full mt-8">
        <p className="font-bold text-text-light">{currentIndex + 1} / {cards.length}</p>
        <button
          onClick={handleNext}
          className="px-6 py-3 bg-primary text-white font-black rounded-xl border-2 border-primary-dark shadow-[3px_3px_0_#2D3436] hover:-translate-y-1 transition-all"
        >
          {currentIndex + 1 < cards.length ? 'Câu Tiếp Theo ➔' : 'Tạo Thẻ Mới ➔'}
        </button>
      </div>
    </motion.div>
  );
}
