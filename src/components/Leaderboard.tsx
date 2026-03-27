'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, getDocs, doc, getDoc, getCountFromServer, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/AuthContext';

interface LeaderboardUser {
  uid: string;
  displayName: string;
  photoURL: string;
  totalScore: number;
  examsDone: number;
}

type TabType = 'score' | 'exams';

export default function Leaderboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('score');
  const [topScore, setTopScore] = useState<LeaderboardUser[]>([]);
  const [topExams, setTopExams] = useState<LeaderboardUser[]>([]);
  const [userRank, setUserRank] = useState<{scoreRank: number, examsRank: number, data: LeaderboardUser} | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  useEffect(() => {
    if (user) {
      fetchUserRank();
    }
  }, [user]);

  const fetchUserRank = async () => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const udata = userDoc.data() as LeaderboardUser;
        
        const scoreQuery = query(collection(db, 'users'), where('totalScore', '>', udata.totalScore || 0));
        const examsQuery = query(collection(db, 'users'), where('examsDone', '>', udata.examsDone || 0));
        
        const [scoreSnap, examsSnap] = await Promise.all([
          getCountFromServer(scoreQuery),
          getCountFromServer(examsQuery)
        ]);

        setUserRank({
          scoreRank: scoreSnap.data().count + 1,
          examsRank: examsSnap.data().count + 1,
          data: udata
        });
      }
    } catch (err) {
      console.error('Error fetching user rank:', err);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      // Top 10 by total score
      const scoreQuery = query(
        collection(db, 'users'),
        orderBy('totalScore', 'desc'),
        limit(10)
      );
      const scoreSnap = await getDocs(scoreQuery);
      setTopScore(scoreSnap.docs.map((d) => d.data() as LeaderboardUser));

      // Top 10 by exams done
      const examsQuery = query(
        collection(db, 'users'),
        orderBy('examsDone', 'desc'),
        limit(10)
      );
      const examsSnap = await getDocs(examsQuery);
      setTopExams(examsSnap.docs.map((d) => d.data() as LeaderboardUser));
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const getRankStyle = (index: number) => {
    if (index === 0) return 'leaderboard-rank-1 font-black';
    if (index === 1) return 'leaderboard-rank-2 font-bold';
    if (index === 2) return 'leaderboard-rank-3 font-bold';
    return 'bg-white border-2 border-border font-semibold shadow-[2px_2px_0_#DFE6E9]';
  };

  const getRankEmoji = (index: number) => {
    if (index === 0) return 'TOP 1';
    if (index === 1) return 'TOP 2';
    if (index === 2) return 'TOP 3';
    return `#${index + 1}`;
  };

  const data = activeTab === 'score' ? topScore : topExams;
  const currentRank = activeTab === 'score' ? userRank?.scoreRank : userRank?.examsRank;
  const currentValue = activeTab === 'score' ? userRank?.data?.totalScore : userRank?.data?.examsDone;

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-white rounded-2xl border-4 border-primary-dark shadow-[8px_8px_0_#2D3436] overflow-hidden flex flex-col h-[600px]"
    >
      {/* Header */}
      <div className="bg-primary border-b-4 border-primary-dark p-4 shrink-0">
        <h2 className="text-white font-black text-xl flex items-center gap-2 drop-shadow-[2px_2px_0_#2D3436]">
          BẢNG XẾP HẠNG
        </h2>
      </div>

      {/* Tabs */}
      <div className="flex border-b-4 border-border shrink-0">
        {[
          { key: 'score' as TabType, label: 'ĐIỂM SỐ' },
          { key: 'exams' as TabType, label: 'SỐ ĐỀ' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-3 text-sm font-black transition-all relative ${
              activeTab === tab.key
                ? 'text-primary-dark bg-primary/10'
                : 'text-text-secondary hover:text-primary hover:bg-gray-50'
            }`}
          >
            {tab.label}
            {activeTab === tab.key && (
              <motion.div
                layoutId="leaderboard-tab"
                className="absolute bottom-0 left-0 right-0 h-1 bg-primary-dark"
              />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4 overflow-y-auto flex-1 bg-[#FDFBF7]">
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 bg-gray-100 border-2 border-border rounded-xl animate-pulse"
              >
                <div className="w-8 h-8 bg-gray-300 rounded-full" />
                <div className="w-10 h-10 bg-gray-300 rounded-full" />
                <div className="flex-1 h-5 bg-gray-300 rounded-lg" />
                <div className="w-12 h-5 bg-gray-300 rounded-lg" />
              </div>
            ))}
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-12 text-text-light font-bold">
            <svg className="w-16 h-16 mx-auto mb-4 text-border" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p className="text-lg text-text-secondary">Chưa có ai xếp hạng</p>
            <p className="text-sm">Hãy làm bài để ghi danh!</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              {data.map((u, i) => {
                const isMe = user?.uid === u.uid;
                return (
                  <motion.div
                    key={u.uid || i}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className={`flex items-center gap-3 p-3 rounded-xl transition-transform hover:-translate-y-1 ${getRankStyle(i)} ${isMe ? 'ring-4 ring-primary ring-opacity-50' : ''}`}
                  >
                    <span className="text-center font-black text-xs md:text-sm drop-shadow-sm min-w-[50px]">
                      {getRankEmoji(i)}
                    </span>
                    <img
                      src={
                        u.photoURL ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(u.displayName || 'U')}&background=6C5CE7&color=fff&size=32&bold=true`
                      }
                      alt=""
                      className="w-10 h-10 rounded-full border-2 border-primary-dark shadow-[2px_2px_0_#2D3436]"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] truncate">
                        {u.displayName || 'Ẩn danh'}
                        {isMe && <span className="ml-2 text-[10px] bg-primary text-white px-2 py-0.5 rounded-full border border-primary-dark">BẠN</span>}
                      </p>
                    </div>
                    <span className="text-sm md:text-base font-black text-primary-dark drop-shadow-sm">
                      {activeTab === 'score'
                        ? `${u.totalScore.toFixed(1)} đ`
                        : `${u.examsDone} đề`}
                    </span>
                  </motion.div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Current User Rank Footer */}
      {user && userRank && !loading && (
        <div className="bg-primary-light/10 border-t-4 border-border p-4 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'U')}&background=6C5CE7&color=fff`}
              alt="You"
              className="w-10 h-10 rounded-full border-2 border-primary-dark"
            />
            <div>
              <p className="text-xs font-bold text-text-secondary uppercase">Hạng của bạn</p>
              <p className="text-lg font-black text-primary-dark">
                #{currentRank}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-text-secondary uppercase">{activeTab === 'score' ? 'Điểm' : 'Số đề'}</p>
            <p className="text-sm font-black text-primary-dark">
              {activeTab === 'score' ? `${(currentValue as number)?.toFixed(1)} đ` : `${currentValue} đề`}
            </p>
          </div>
        </div>
      )}
    </motion.div>
  );
}
