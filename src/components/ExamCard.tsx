'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { motion } from 'framer-motion';

interface ExamCardProps {
  id: string;
  grade: number;
  title: string;
  highestScore?: number;
  status: 'red' | 'yellow' | 'green';
  index: number;
}

export default function ExamCard({
  id,
  grade,
  title,
  highestScore,
  status,
  index,
}: ExamCardProps) {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);

  const handleNavigate = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isNavigating) return;
    setIsNavigating(true);
    // Smooth delay before routing to allow animation to play out
    setTimeout(() => {
      router.push(`/exam/${id}`);
    }, 400);
  };

  const gradeColors: Record<number, string> = {
    10: 'bg-accent-blue border-blue-600',
    11: 'bg-primary border-primary-dark',
    12: 'bg-secondary border-pink-600',
  };

  const statusConfig = {
    red: {
      bg: 'bg-white',
      border: 'border-2 border-border',
      shadow: 'shadow-[4px_4px_0_#DFE6E9]',
      hoverShadow: 'hover:shadow-[6px_6px_0_#DFE6E9]',
      badgeColor: 'bg-gray-100 text-gray-500 border-gray-300',
      badgeText: 'Chưa làm',
    },
    yellow: {
      bg: 'bg-yellow-50',
      border: 'border-2 border-yellow-400',
      shadow: 'shadow-[4px_4px_0_#FDCB6E]',
      hoverShadow: 'hover:shadow-[6px_6px_0_#FDCB6E]',
      badgeColor: 'bg-yellow-200 text-yellow-700 border-yellow-400',
      badgeText: 'Cần cố gắng',
    },
    green: {
      bg: 'bg-green-50',
      border: 'border-2 border-green-400',
      shadow: 'shadow-[4px_4px_0_#00B894]',
      hoverShadow: 'hover:shadow-[6px_6px_0_#00B894]',
      badgeColor: 'bg-green-200 text-green-700 border-green-500',
      badgeText: 'Tốt',
    },
  };

  const config = statusConfig[status];

  return (
    <div onClick={handleNavigate} className="block h-full relative group">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05, duration: 0.3 }}
        whileHover={{
          y: -4,
        }}
        whileTap={{ y: 2 }}
        className={`h-full relative rounded-2xl p-6 cursor-pointer transition-all duration-200 ${config.bg} ${config.border} ${config.shadow} ${config.hoverShadow} group flex flex-col justify-between`}
      >
        <div>
          {/* Top Row: Grade badge + Status */}
          <div className="flex items-center justify-between mb-4">
            <span
              className={`px-3 py-1 rounded-lg text-xs font-black text-white border-2 shadow-[2px_2px_0_rgba(0,0,0,0.1)] ${gradeColors[grade] || 'bg-gray-400 border-gray-600'}`}
            >
              Lớp {grade}
            </span>
            <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${config.badgeColor}`}>
              {config.badgeText}
            </span>
          </div>

          {/* Title */}
          <h3 className="text-xl font-black text-primary-dark group-hover:text-primary transition-colors mb-4 line-clamp-2 leading-snug">
            {title}
          </h3>
        </div>

        {/* Score footer */}
        <div className="mt-auto">
          {highestScore !== undefined && highestScore > 0 ? (
            <div className="flex items-center justify-between bg-white/60 p-3 rounded-xl border-2 border-transparent group-hover:border-black/5 transition-colors">
              <span className="text-sm font-bold text-text-secondary">Điểm cao nhất</span>
              <span className="text-lg font-black text-primary-dark">
                {highestScore.toFixed(1)}
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-between bg-white/40 p-3 rounded-xl">
              <span className="text-sm font-bold text-text-light">Chưa có điểm</span>
              <span className="text-lg font-black text-text-light opacity-50">-.-</span>
            </div>
          )}
        </div>

        {/* Loading Overlay */}
        {isNavigating && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 rounded-2xl flex items-center justify-center border-4 border-primary-dark"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full shadow-sm"
            />
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
