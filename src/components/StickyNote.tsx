'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface StickyNoteProps {
  message?: string;
  weaknesses?: string[];
  onConfirm?: () => void;
  confirmText?: string;
}

const MOTIVATIONS = [
  "Trên bước đường thành công không có dấu chân của kẻ lười biếng. – Lỗ Tấn",
  "Thiên tài 1% là cảm hứng và 99% là mồ hôi. – Thomas Edison",
  "Học vấn do người siêng năng đạt được, tài sản do người tinh tế sở hữu, quyền lợi do người dũng cảm nắm giữ, thiên đường do người lương thiện xây dựng. – Benjamin Franklin",
  "Sự kiên nhẫn đắng chát, nhưng quả của nó lại ngọt ngào. – Jean-Jacques Rousseau",
  "Cách duy nhất để làm nên những việc vĩ đại là yêu những việc bạn làm. – Steve Jobs",
  "Học, học nữa, học mãi. – V.I. Lenin"
];

export default function StickyNote({ message = "", weaknesses = [], onConfirm, confirmText = "Đã hiểu" }: StickyNoteProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [fallbackQuote, setFallbackQuote] = useState("");

  useEffect(() => {
    setFallbackQuote(MOTIVATIONS[Math.floor(Math.random() * MOTIVATIONS.length)]);
  }, []);

  const hasWeakness = Array.isArray(weaknesses) && weaknesses.length > 0;
  const displayMessage = message || (!hasWeakness ? fallbackQuote : "Chú ý cải thiện các điểm yếu sau đây trong các bài làm tiếp theo để đạt điểm cao hơn nhé!");

  if (!displayMessage) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: 100, opacity: 0, scale: 0.8 }}
          animate={{ x: 0, opacity: 1, scale: 1 }}
          exit={{ x: 100, opacity: 0, scale: 0.8 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="fixed bottom-6 right-6 z-40 max-w-sm"
        >
          <div className="relative">
            {/* Sticky note card */}
            <div className="bg-[#FFF9C4] rounded-2xl border-4 border-primary-dark shadow-[6px_6px_0_#2D3436] overflow-hidden transform rotate-1 hover:rotate-0 transition-transform">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-2 border-b-2 border-primary-dark bg-[#FFF176]">
                <span className="text-sm font-black text-primary-dark uppercase drop-shadow-sm">
                  {message || hasWeakness ? 'Lời khuyên từ AI' : 'Góc Động Lực'}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsMinimized(!isMinimized)}
                    className="w-6 h-6 rounded-full bg-white border-2 border-primary-dark hover:bg-gray-100 text-primary-dark font-black text-sm flex items-center justify-center transition-colors shadow-[2px_2px_0_#2D3436] active:translate-y-0.5 active:shadow-none"
                  >
                    {isMinimized ? '+' : '−'}
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="w-6 h-6 rounded-full bg-[#FF7675] border-2 border-primary-dark hover:bg-red-400 text-white font-black text-sm flex items-center justify-center transition-colors shadow-[2px_2px_0_#2D3436] active:translate-y-0.5 active:shadow-none"
                  >
                    ×
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {!isMinimized && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="px-4 py-3"
                  >
                    <p className="text-sm font-semibold text-primary-dark leading-relaxed mb-3">
                      {displayMessage}
                    </p>

                    {hasWeakness && (
                      <div className="border-t-2 border-primary/20 pt-2 mb-3">
                        <p className="text-xs font-black text-[#D63031] mb-2 uppercase">
                          Điểm yếu lặp lại:
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {weaknesses.slice(0, 5).map((w, i) => (
                            <span
                              key={i}
                              className="px-2 py-1 bg-white text-[#D63031] text-[11px] font-bold rounded-lg border-2 border-[#D63031] shadow-[2px_2px_0_#D63031]"
                            >
                              {w}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {onConfirm && (
                      <button
                        onClick={onConfirm}
                        className="w-full mt-2 py-2 bg-primary text-white font-black rounded-lg border-2 border-primary-dark shadow-[3px_3px_0_#2D3436] hover:-translate-y-0.5 transition-transform active:translate-y-0 active:shadow-none"
                      >
                        {confirmText}
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
