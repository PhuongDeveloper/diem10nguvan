'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useMemo } from 'react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/AuthContext';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import type { ExamInfo } from '@/lib/examData';
import ExamCard from '@/components/ExamCard';
import Leaderboard from '@/components/Leaderboard';
import StickyNote from '@/components/StickyNote';

interface ProgressData {
  examId: string;
  highestScore: number;
  status: 'red' | 'yellow' | 'green';
}

export default function HomePage() {
  const { user } = useAuth();
  const [activeGrade, setActiveGrade] = useState<number | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 6;
  const [progressMap, setProgressMap] = useState<Record<string, ProgressData>>({});
  const [exams, setExams] = useState<ExamInfo[]>([]);
  const [userWeaknesses, setUserWeaknesses] = useState<string[]>([]);
  const [averageScores, setAverageScores] = useState<Record<string, number>>({});
  const [isAIMode, setIsAIMode] = useState(false);
  const [showAIModeModal, setShowAIModeModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [pendingExamId, setPendingExamId] = useState<string | null>(null);

  // 1. Fetch exams immediately, regardless of auth state
  useEffect(() => {
    const fetchExams = async () => {
      try {
        const res = await fetch('/api/exams');
        const data = await res.json();
        if (data.success) {
          setExams(data.exams);
        }
      } catch (err) {
        console.error('Error fetching exams:', err);
      }
    };

    fetchExams();
    const interval = setInterval(fetchExams, 20000); // Poll every 20s
    return () => clearInterval(interval);
  }, []);

  // 2. Fetch global progress to calculate average scores
  useEffect(() => {
    const fetchAverages = async () => {
      try {
        const snap = await getDocs(collection(db, 'progress'));
        const examScores: Record<string, number[]> = {};
        
        snap.docs.forEach((doc) => {
          const data = doc.data() as ProgressData;
          if (data.highestScore >= 0) {
            if (!examScores[data.examId]) examScores[data.examId] = [];
            examScores[data.examId].push(data.highestScore);
          }
        });

        const averages: Record<string, number> = {};
        Object.keys(examScores).forEach(examId => {
          const scores = examScores[examId];
          const sum = scores.reduce((a, b) => a + b, 0);
          averages[examId] = scores.length > 0 ? Number((sum / scores.length).toFixed(1)) : 0;
        });

        setAverageScores(averages);
      } catch (err) {
        console.error('Error fetching averages:', err);
      }
    };
    fetchAverages();
  }, []); // Run once on mount

  // 3. Fetch user-specific progress when logged in
  useEffect(() => {
    if (!user) {
      setProgressMap({});
      setUserWeaknesses([]);
      return;
    }

    const fetchProgress = async () => {
      try {
        const q = query(
          collection(db, 'progress'),
          where('userId', '==', user.uid)
        );
        const snap = await getDocs(q);
        const map: Record<string, ProgressData> = {};
        snap.docs.forEach((doc) => {
          const data = doc.data() as ProgressData;
          map[data.examId] = data;
        });
        setProgressMap(map);
      } catch (err) {
        console.error('Error fetching progress:', err);
      }
    };

    const fetchWeaknesses = async () => {
      try {
        const weakSnap = await getDoc(doc(db, 'weaknesses', user.uid));
        if (weakSnap.exists()) {
          setUserWeaknesses(weakSnap.data().weaknesses || []);
        }
      } catch (err) {
        console.error('Error fetching weaknesses:', err);
      }
    };

    fetchProgress();
    fetchWeaknesses();
  }, [user]);

  type SortMode = 'default' | 'not_done' | 'done' | 'low_score';
  const [sortMode, setSortMode] = useState<SortMode>('default');

  const filteredExams = useMemo(() => {
    const baseExams = activeGrade === 'all'
      ? [...exams]
      : exams.filter((e) => e.grade === activeGrade);

    if (sortMode === 'default') return baseExams;

    return baseExams.sort((a, b) => {
      const scoreA = progressMap[a.id]?.highestScore ?? -1;
      const scoreB = progressMap[b.id]?.highestScore ?? -1;

      const isDoneA = scoreA >= 0;
      const isDoneB = scoreB >= 0;

      if (sortMode === 'not_done') {
        if (isDoneA && !isDoneB) return 1;
        if (!isDoneA && isDoneB) return -1;
      } else if (sortMode === 'done') {
        if (isDoneA && !isDoneB) return -1;
        if (!isDoneA && isDoneB) return 1;
      } else if (sortMode === 'low_score') {
        const isLowA = isDoneA && scoreA < 5;
        const isLowB = isDoneB && scoreB < 5;
        if (isLowA && !isLowB) return -1;
        if (!isLowA && isLowB) return 1;
        if (isLowA && isLowB) return scoreA - scoreB;
      }
      return 0;
    });
  }, [exams, activeGrade, sortMode, progressMap]);

  const totalPages = Math.max(1, Math.ceil(filteredExams.length / ITEMS_PER_PAGE));
  const paginatedExams = filteredExams.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const grades = [
    { key: 'all' as const, label: 'Tất cả' },
    { key: 10 as const, label: 'Lớp 10' },
    { key: 11 as const, label: 'Lớp 11' },
    { key: 12 as const, label: 'Lớp 12' },
  ];

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      setShowLoginModal(false);
      if (pendingExamId) {
        // Redirect to the exam they were trying to access
        window.location.href = `/exam/${pendingExamId}`;
      }
    } catch (error) {
      console.error('Error signing in:', error);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10"
      >
        <motion.h1
          className="text-4xl md:text-5xl font-black mb-3 text-primary-dark tracking-tight drop-shadow-[2px_2px_0px_#2D3436]"
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        >
          Chọn Đề & Bắt Đầu Luyện Thi
        </motion.h1>
        <p className="text-text-secondary text-lg max-w-xl mx-auto">
          AI sẽ chấm bài, phân tích điểm yếu và đưa ra lời khuyên riêng cho bạn
        </p>

        {/* AI Tutor Mode Toggle */}
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={() => {
              if (!isAIMode) setShowAIModeModal(true);
              else setIsAIMode(false);
            }}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl border-2 font-black text-sm transition-all hover:-translate-y-1 ${
              isAIMode
                ? 'bg-amber-400 border-amber-800 text-amber-900 shadow-[4px_4px_0_#92400E]'
                : 'bg-white border-primary-dark text-primary-dark shadow-[4px_4px_0_#2D3436]'
            }`}
          >
            <span>{isAIMode ? 'TẮT' : 'BẬT'}</span>
            <span>Chế độ Luyện tập với AI</span>
          </button>
        </div>

        {/* AI Mode Banner */}
        {isAIMode && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 inline-flex items-center gap-2 bg-amber-100 border-2 border-amber-500 rounded-xl px-4 py-2 text-sm font-bold text-amber-800"
          >
            Đang bật Chế độ Luyện tập — Click vào đề để bắt đầu luyện tập có AI hỗ trợ
          </motion.div>
        )}
      </motion.div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left: Exam List */}
        <div className="flex-1">
          {/* Controls: Grade Tabs & Sorting */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 bg-white p-3 rounded-2xl border-2 border-border shadow-[4px_4px_0_#DFE6E9]">
            <div className="flex gap-2 flex-wrap">
              {grades.map((g) => (
                <motion.button
                  key={g.key}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    if (activeGrade !== g.key) {
                      setActiveGrade(g.key);
                      setCurrentPage(1);
                    }
                  }}
                  className={`px-4 py-2 rounded-xl text-sm font-black transition-all duration-200 border-2 ${
                    activeGrade === g.key
                      ? 'bg-primary border-primary-dark text-white shadow-[2px_2px_0_#2D3436] translate-y-[-1px]'
                      : 'bg-white text-text-primary border-transparent hover:border-border'
                  }`}
                >
                  {g.label}
                </motion.button>
              ))}
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-sm font-bold text-text-secondary hidden xl:inline">Ưu tiên:</span>
              <select
                value={sortMode}
                onChange={(e) => {
                  setSortMode(e.target.value as SortMode);
                  setCurrentPage(1);
                }}
                className="px-4 py-2 bg-white text-primary-dark text-sm font-black border-2 border-primary-dark rounded-xl shadow-[2px_2px_0_#2D3436] outline-none cursor-pointer focus:ring-2 focus:ring-primary/20 transition-all hover:-translate-y-0.5"
              >
                <option value="default">Mới nhất</option>
                <option value="not_done">Chưa làm</option>
                <option value="done">Đã làm</option>
                <option value="low_score">Điểm yếu (&lt;5)</option>
              </select>
            </div>
          </div>

          {/* Exam Grid */}
          <AnimatePresence mode="wait">
            <motion.div
              key={String(activeGrade)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"
            >
              {paginatedExams.map((exam, i) => {
                const progress = progressMap[exam.id];
                const avgScore = averageScores[exam.id] || 0;
                return (
                  <ExamCard
                    key={exam.id}
                    id={isAIMode ? `${exam.id}?aiMode=true` : exam.id}
                    grade={exam.grade}
                    title={exam.title}
                    highestScore={progress?.highestScore}
                    averageScore={avgScore}
                    status={progress?.status || 'red'}
                    index={i}
                    onClick={!user ? () => {
                      setPendingExamId(isAIMode ? `${exam.id}?aiMode=true` : exam.id);
                      setShowLoginModal(true);
                    } : undefined}
                  />
                );
              })}
            </motion.div>
          </AnimatePresence>

          {filteredExams.length === 0 && (
            <div className="text-center py-12 text-text-light">
              <svg className="w-12 h-12 mx-auto mb-4 text-text-light" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p>Chưa có đề thi nào cho lớp này</p>
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-8">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-5 py-2.5 border-2 border-primary-dark text-primary-dark rounded-xl font-black bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:disabled:translate-y-0 hover:disabled:shadow-none hover:-translate-y-1 hover:shadow-[4px_4px_0_#2D3436] transition-all"
              >
                ← Trước
              </button>
              <span className="font-bold text-lg text-primary-dark bg-primary-light/20 px-4 py-2 rounded-xl border-2 border-primary/20">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-5 py-2.5 border-2 border-primary-dark text-primary-dark rounded-xl font-black bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:disabled:translate-y-0 hover:disabled:shadow-none hover:-translate-y-1 hover:shadow-[4px_4px_0_#2D3436] transition-all"
              >
                Sau →
              </button>
            </div>
          )}
        </div>

        {/* Right: Leaderboard */}
        <div className="w-full lg:w-80 lg:flex-shrink-0">
          <div className="sticky top-24">
            <Leaderboard />
          </div>
        </div>
      </div>

      {/* Global Sticky Note */}
      {user && <StickyNote message="" weaknesses={userWeaknesses} />}

      {/* AI Mode Confirmation Modal */}
      <AnimatePresence>
        {showAIModeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-2xl border-4 border-primary-dark p-6 sm:p-8 max-w-lg w-full shadow-[8px_8px_0_#2D3436] relative overflow-hidden"
            >
              <button
                onClick={() => setShowAIModeModal(false)}
                className="absolute top-4 right-4 text-text-light hover:text-text-primary transition-colors"
                title="Đóng"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="flex items-center gap-3 mb-4">
                <span className="text-4xl text-amber-500">🤖</span>
                <h2 className="text-2xl font-black text-primary-dark">Chế Độ Ai Tutor</h2>
              </div>
              
              <div className="mb-6 text-text-secondary leading-relaxed space-y-3">
                <p>
                  Xin chào, cô là <strong className="text-primary">Tú AI</strong>. Khi em làm bài ở chế độ này, cô sẽ:
                </p>
                <ul className="list-disc leading-relaxed text-sm ml-5 pl-2">
                  <li>Nghiêm khắc phát hiện các <b>lỗi diễn đạt ngớ ngẩn</b> (ngữ pháp, chính tả).</li>
                  <li>Nếu để câu dài quá 50 chữ không ngắt nghỉ, cô sẽ <b>gạch chân nhắc nhở</b> ngay.</li>
                  <li>Di chuyển dàn ý linh hoạt theo mạch viết, gợi ý "nên viết gì tiếp theo" để <b>không bao giờ bí ý tưởng</b>.</li>
                </ul>
                <p className="mt-4 text-xs italic text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200">
                  <strong className="text-amber-800 uppercase block mb-1">Cảnh Báo Nho Nhỏ:</strong>
                  Tuy nhiên, vì đây là chế độ Luyện Tập, kết quả bài thi này sẽ <b>KHÔNG</b> được lưu vào hồ sơ học bạ (Thống Kê, Top Điểm, v.v) nhằm duy trì bảng xếp hạng công bằng nhé.
                </p>
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 mt-8">
                <button
                  onClick={() => setShowAIModeModal(false)}
                  className="px-5 py-2.5 rounded-xl border-2 border-border text-text-secondary font-bold hover:bg-gray-50 transition-all font-quicksand"
                >
                  <span className="text-lg">Từ Chối</span>
                </button>
                <button
                  onClick={() => {
                    setIsAIMode(true);
                    setShowAIModeModal(false);
                  }}
                  className="px-5 py-2.5 bg-primary rounded-xl border-2 border-primary-dark text-white font-black shadow-[4px_4px_0_#2D3436] hover:-translate-y-1 transition-all"
                >
                  <span className="text-lg">Đồng Ý ! Bật Lên Nào</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Require Login Modal */}
      <AnimatePresence>
        {showLoginModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-2xl border-4 border-primary-dark p-6 sm:p-8 max-w-sm w-full shadow-[8px_8px_0_#2D3436] relative text-center"
            >
              <button
                onClick={() => {
                  setShowLoginModal(false);
                  setPendingExamId(null);
                }}
                className="absolute top-4 right-4 text-text-light hover:text-text-primary transition-colors"
                title="Đóng"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="text-6xl mb-4">🔐</div>
              <h2 className="text-xl font-black text-primary-dark mb-2">Bạn Cần Đăng Nhập</h2>
              <p className="text-sm text-text-secondary mb-6">
                Vui lòng đăng nhập để bắt đầu làm bài và lưu lại kết quả thi của bạn nhé!
              </p>

              <button
                onClick={handleLogin}
                className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-white text-gray-800 border-2 border-gray-300 rounded-xl hover:bg-gray-50 hover:shadow-[4px_4px_0_#2D3436] hover:-translate-y-1 transition-all font-bold"
              >
                <img src="/google.svg" alt="Google" className="w-5 h-5" />
                Đăng nhập bằng Google
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
