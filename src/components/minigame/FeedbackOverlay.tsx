'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

interface FeedbackOverlayProps {
  type: 'correct' | 'incorrect' | null;
  scoreValue?: number;
  onFinished: () => void;
}

export default function FeedbackOverlay({ type, scoreValue = 10, onFinished }: FeedbackOverlayProps) {
  useEffect(() => {
    if (type) {
      const sound = new Audio(type === 'correct' ? '/dung.mp3' : '/sai.mp3');
      sound.play().catch(e => console.error("Audio play failed", e));
      
      const timer = setTimeout(() => {
        onFinished();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [type, onFinished]);

  return (
    <>
      {/* Screen Border Flash */}
      <AnimatePresence>
        {type && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 z-50 pointer-events-none border-[12px] sm:border-[20px] transition-colors duration-200 ${
              type === 'correct' ? 'border-primary' : 'border-red-500'
            }`}
          />
        )}
      </AnimatePresence>

      {/* Flying Score Animation */}
      <AnimatePresence>
        {type === 'correct' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 0, x: '-50%' }}
            animate={{ 
              opacity: [0, 1, 1, 0], 
              scale: [0.5, 1.5, 1.5, 0.8],
              y: [0, -40, -40, -300],
              x: ['-50%', '-50%', '-50%', '150%'] 
            }}
            transition={{ duration: 0.8, times: [0, 0.2, 0.6, 1], ease: "easeInOut" }}
            className="fixed top-1/2 left-1/2 z-50 pointer-events-none text-4xl sm:text-6xl font-black text-primary-dark drop-shadow-[4px_4px_0_#FDCB6E] select-none"
          >
            +{scoreValue} XP
          </motion.div>
        )}
      </AnimatePresence>

      {/* Shake Effect for whole screen is better handled by applying a class to the container, 
          but we can simulate it with a invisible motion div if needed, 
          or better yet, the parent component can apply the shake. */}
    </>
  );
}
