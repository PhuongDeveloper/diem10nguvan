'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import FlashCardGame from '@/components/minigame/FlashCardGame';
import MatchGame from '@/components/minigame/MatchGame';
import SpeedQuizGame from '@/components/minigame/SpeedQuizGame';

export default function MinigamePage() {
  const [activeTab, setActiveTab] = useState<'flashcard' | 'match' | 'quiz'>('flashcard');

  const TABS = [
    { id: 'flashcard' as const, label: 'Lật Thẻ Ôn Tập', icon: '🎴' },
    { id: 'match' as const, label: 'Nối Khái Niệm', icon: '🔗' },
    { id: 'quiz' as const, label: 'Trắc Nghiệm', icon: '⚡' },
  ];

  return (
    <div className="min-h-[calc(100vh-72px)] bg-bg-main py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto mb-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-block"
        >
          <span className="px-3 py-1 bg-amber-100 text-amber-800 font-bold text-xs rounded-full border border-amber-300 mb-3 inline-block shadow-[2px_2px_0_#F59E0B]">
            Vừa học vừa chơi
          </span>
          <h1 className="text-3xl md:text-4xl font-extrabold text-primary mb-3">
            Hành Trình Ngữ Văn
          </h1>
          <p className="text-text-secondary">
            Ôn tập kiến thức môn Ngữ Văn qua các trò chơi nhỏ thú vị.
          </p>
        </motion.div>
      </div>

      <div className="max-w-4xl mx-auto mb-10 flex flex-wrap justify-center gap-4">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-3 rounded-xl border-2 font-bold text-sm transition-all flex items-center gap-2 ${activeTab === tab.id
                ? 'bg-primary border-primary-dark text-white shadow-[4px_4px_0_#2D3436] -translate-y-1'
                : 'bg-white border-border text-text-secondary hover:border-primary hover:text-primary'
              }`}
          >
            <span className="text-lg">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      <motion.div
        key={activeTab}
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full"
      >
        {activeTab === 'flashcard' && <FlashCardGame />}
        {activeTab === 'match' && <MatchGame />}
        {activeTab === 'quiz' && <SpeedQuizGame />}
      </motion.div>
    </div>
  );
}
