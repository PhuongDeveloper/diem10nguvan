'use client';

import { useState, useEffect, Suspense } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import FlashCardGame from '@/components/minigame/FlashCardGame';
import MatchGame from '@/components/minigame/MatchGame';
import SpeedQuizGame from '@/components/minigame/SpeedQuizGame';
import PvPMatchGame from '@/components/minigame/PvPMatchGame';
import PvPQuizGame from '@/components/minigame/PvPQuizGame';

type TabId = 'flashcard' | 'match' | 'quiz' | 'pvp-match' | 'pvp-quiz';

function MinigameContent() {
  const searchParams = useSearchParams();
  const pvpParam = searchParams.get('pvp');

  const [activeTab, setActiveTab] = useState<TabId>('flashcard');

  useEffect(() => {
    if (pvpParam === 'match') {
      setActiveTab('pvp-match');
    } else if (pvpParam === 'quiz') {
      setActiveTab('pvp-quiz');
    }
  }, [pvpParam]);

  const SOLO_TABS = [
    { id: 'flashcard' as const, label: 'Lật Thẻ Ôn Tập' },
    { id: 'match' as const, label: 'Nối Khái Niệm' },
    { id: 'quiz' as const, label: 'Trắc Nghiệm' },
  ];

  const PVP_TABS = [
    { id: 'pvp-match' as const, label: 'Nối Khái Niệm PvP' },
    { id: 'pvp-quiz' as const, label: 'Trắc Nghiệm PvP' },
  ];

  return (
    <>
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

      {/* Tab Groups */}
      <div className="max-w-4xl mx-auto mb-10">
        {/* Solo Mode Tabs */}
        <div className="mb-3">
          <p className="text-xs font-bold text-text-light uppercase tracking-wider mb-2 ml-1">Chơi đơn</p>
          <div className="flex flex-wrap gap-2">
            {SOLO_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl border-2 font-bold text-xs sm:text-sm transition-all ${
                  activeTab === tab.id
                    ? 'bg-primary border-primary-dark text-white shadow-[3px_3px_0_#2D3436] -translate-y-0.5'
                    : 'bg-white border-border text-text-secondary hover:border-primary hover:text-primary'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* PvP Mode Tabs */}
        <div>
          <p className="text-xs font-bold text-text-light uppercase tracking-wider mb-2 ml-1">Đối kháng (PvP)</p>
          <div className="flex flex-wrap gap-2">
            {PVP_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl border-2 font-bold text-xs sm:text-sm transition-all ${
                  activeTab === tab.id
                    ? 'bg-red-500 border-red-800 text-white shadow-[3px_3px_0_#991B1B] -translate-y-0.5'
                    : 'bg-white border-border text-text-secondary hover:border-red-400 hover:text-red-500'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
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
        {activeTab === 'pvp-match' && <PvPMatchGame />}
        {activeTab === 'pvp-quiz' && <PvPQuizGame />}
      </motion.div>
    </>
  );
}

export default function MinigamePage() {
  return (
    <div className="min-h-[calc(100vh-72px)] bg-bg-main py-10 px-4 sm:px-6 lg:px-8">
      <Suspense fallback={
        <div className="max-w-4xl mx-auto text-center py-16">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
        </div>
      }>
        <MinigameContent />
      </Suspense>
    </div>
  );
}
