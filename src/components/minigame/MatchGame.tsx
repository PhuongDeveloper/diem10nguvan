'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import FeedbackOverlay from './FeedbackOverlay';

interface Pair {
  concept: string;
  description: string;
}

export default function MatchGame() {
  const [allPairs, setAllPairs] = useState<Pair[]>([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [items, setItems] = useState<{ id: string; text: string; type: 'concept' | 'description'; matched: boolean }[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [feedbackType, setFeedbackType] = useState<'correct' | 'incorrect' | null>(null);

  const fetchPairs = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/minigame', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'match' })
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setAllPairs(data.data);
        setCurrentRound(0);
        setupRound(data.data, 0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setupRound = (pairs: Pair[], roundIndex: number) => {
    // Lấy 5 cặp mỗi vòng để không bị quá tải màn hình (10 thẻ)
    const startIndex = roundIndex * 5;
    const roundPairs = pairs.slice(startIndex, startIndex + 5);
    
    if (roundPairs.length === 0) return;

    const gameItems = roundPairs.flatMap((pair, idx) => [
      { id: `c_${startIndex + idx}`, text: pair.concept, type: 'concept' as const, matched: false },
      { id: `d_${startIndex + idx}`, text: pair.description, type: 'description' as const, matched: false },
    ]).sort(() => Math.random() - 0.5);
    
    setItems(gameItems);
    setSelectedIds([]);
  };

  useEffect(() => {
    fetchPairs();
    setScore(0);
  }, [fetchPairs]);

  const handleSelect = (id: string) => {
    if (selectedIds.length === 2) return; 
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
        // Match!
        setFeedbackType('correct');
        setTimeout(() => {
          setItems(prev => prev.map(i => (i.id === id1 || i.id === id2) ? { ...i, matched: true } : i));
          setSelectedIds([]);
          setScore(s => s + 10);
        }, 500);
      } else {
        // Wrong
        setFeedbackType('incorrect');
        setTimeout(() => {
          setSelectedIds([]);
          setFeedbackType(null);
        }, 800);
      }
    }
  };

  const isComplete = items.length > 0 && items.every(i => i.matched);

  // Chuyển sang vòng tiếp theo nếu hoàn thành vòng hiện tại
  useEffect(() => {
    if (isComplete) {
      const nextRound = currentRound + 1;
      const totalRounds = Math.ceil(allPairs.length / 5);
      
      if (nextRound < totalRounds) {
        setTimeout(() => {
          setCurrentRound(nextRound);
          setupRound(allPairs, nextRound);
        }, 1500);
      }
    }
  }, [isComplete, currentRound, allPairs]);

  const isFullyComplete = isComplete && currentRound + 1 >= Math.ceil(allPairs.length / 5);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center max-w-2xl mx-auto w-full">
        <div className="text-center mb-6">
          <div className="h-7 w-48 bg-gray-200 rounded-lg animate-pulse mx-auto mb-2"></div>
          <div className="h-4 w-24 bg-gray-200 rounded-lg animate-pulse mx-auto"></div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 w-full">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-[100px] bg-gray-200 rounded-xl animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) return null;

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
      <div className="text-center mb-6">
        <h2 className="text-xl font-black text-primary-dark">Nối Khái Niệm - Minh Họa</h2>
        <p className="text-sm font-bold text-text-secondary mt-1">Điểm: {score}</p>
      </div>

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
                className={`p-3 rounded-xl border-2 text-sm min-h-[100px] transition-all flex items-center justify-center text-center ${
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

      {isFullyComplete && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 flex flex-col items-center justify-center bg-white p-6 rounded-2xl border-4 border-primary-dark shadow-[6px_6px_0_#2D3436] w-full max-w-md"
        >
          <div className="text-3xl mb-2">🎉</div>
          <div className="text-xl mb-2 font-black text-primary-dark">Ghi nhớ xuất sắc!</div>
          <p className="mb-6 text-text-secondary font-bold">Bạn đã nối đúng tất cả ({allPairs.length} cặp).</p>
          <button
            onClick={() => {
              fetchPairs();
            }}
            className="w-full px-6 py-3 bg-primary text-white font-black rounded-xl border-2 border-primary-dark shadow-[4px_4px_0_#2D3436] hover:-translate-y-1 transition-transform"
          >
            Tạo Bộ Khái Niệm Mới
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}
