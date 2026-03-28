'use client';

import { useState, useEffect, use } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/AuthContext';
import { sendChallenge, getStars, type PlayerInfo } from '@/lib/realtimeService';
import { useRouter } from 'next/navigation';

interface UserProfile {
  uid: string;
  displayName: string;
  photoURL: string;
  email: string;
  totalScore: number;
  examsDone: number;
  stars: number;
}

export default function ProfilePage({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = use(params);
  const { user } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [challengeSent, setChallengeSent] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const isOwnProfile = user?.uid === uid;

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) {
          setProfile({ uid, ...userDoc.data() } as UserProfile);
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [uid]);

  const handleChallenge = async (gameType: 'match' | 'quiz') => {
    if (!user || !profile || isSending) return;
    setIsSending(true);

    try {
      const stars = await getStars(user.uid);
      const myInfo: PlayerInfo = {
        odId: user.uid,
        displayName: user.displayName || 'Ẩn danh',
        photoURL: user.photoURL || '',
        stars,
      };

      await sendChallenge(myInfo, uid, gameType);
      setChallengeSent(true);
      setShowChallengeModal(false);

      // Reset after 5 seconds
      setTimeout(() => setChallengeSent(false), 5000);
    } catch (err) {
      console.error('Error sending challenge:', err);
    } finally {
      setIsSending(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16">
        <div className="animate-pulse space-y-6">
          <div className="flex flex-col items-center">
            <div className="w-24 h-24 rounded-full bg-gray-200 mb-4" />
            <div className="h-6 w-40 bg-gray-200 rounded mb-2" />
            <div className="h-4 w-32 bg-gray-200 rounded" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-200 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <h2 className="text-xl font-black text-primary-dark mb-2">Không tìm thấy</h2>
        <p className="text-text-secondary text-sm">Người dùng này không tồn tại.</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      {/* Profile Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border-2 border-primary-dark rounded-2xl shadow-[6px_6px_0_#2D3436] p-6 mb-6 text-center relative overflow-hidden"
      >
        <div className="absolute top-0 inset-x-0 h-20 bg-gradient-to-b from-primary/10 to-transparent" />
        
        <img
          src={profile.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.displayName)}&background=6C5CE7&color=fff&size=128`}
          alt={profile.displayName}
          className="w-24 h-24 rounded-full border-4 border-primary shadow-lg mx-auto mb-4 relative z-10"
        />
        <h1 className="text-2xl font-black text-primary-dark mb-1">{profile.displayName}</h1>
        <p className="text-sm text-text-secondary mb-4">{profile.email}</p>
        
        {/* Star badge */}
        <div className="inline-flex items-center gap-1.5 bg-amber-50 border-2 border-amber-300 rounded-xl px-4 py-2 mb-2">
          <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          <span className="text-lg font-black text-amber-700">{profile.stars}</span>
          <span className="text-xs text-amber-600 font-bold">sao</span>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-3 gap-3 mb-6"
      >
        <div className="bg-white border-2 border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-black text-primary">{profile.examsDone}</p>
          <p className="text-[10px] font-bold text-text-light uppercase">Đề đã làm</p>
        </div>
        <div className="bg-white border-2 border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-black text-primary">
            {profile.examsDone > 0 ? (profile.totalScore / profile.examsDone).toFixed(1) : '0'}
          </p>
          <p className="text-[10px] font-bold text-text-light uppercase">Điểm TB</p>
        </div>
        <div className="bg-white border-2 border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-black text-amber-600">{profile.stars}</p>
          <p className="text-[10px] font-bold text-text-light uppercase">PvP Sao</p>
        </div>
      </motion.div>

      {/* Actions */}
      {!isOwnProfile && user && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {challengeSent ? (
            <div className="bg-green-50 border-2 border-green-300 rounded-xl p-4 text-center">
              <p className="text-green-700 font-bold text-sm">
                Lời thách đấu đã được gửi! Đang chờ phản hồi...
              </p>
            </div>
          ) : (
            <button
              onClick={() => setShowChallengeModal(true)}
              className="w-full px-6 py-3.5 bg-red-500 text-white font-black rounded-xl border-2 border-red-800 shadow-[4px_4px_0_#991B1B] hover:-translate-y-1 hover:shadow-[6px_6px_0_#991B1B] transition-all text-sm"
            >
              Thách Đấu
            </button>
          )}
        </motion.div>
      )}

      {/* Challenge Modal */}
      <AnimatePresence>
        {showChallengeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="bg-white rounded-2xl border-2 border-primary-dark p-6 max-w-sm w-full shadow-[6px_6px_0_#2D3436]"
            >
              <h2 className="text-lg font-black text-primary-dark mb-1">Chọn trò chơi</h2>
              <p className="text-sm text-text-secondary mb-6">
                Thách đấu <strong>{profile.displayName}</strong>
              </p>
              
              <div className="space-y-3 mb-6">
                <button
                  onClick={() => handleChallenge('match')}
                  disabled={isSending}
                  className="w-full p-4 bg-white border-2 border-primary-dark rounded-xl font-bold text-left hover:bg-primary/5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_#2D3436] transition-all disabled:opacity-50"
                >
                  <span className="text-sm font-black text-primary-dark">Nối Khái Niệm</span>
                  <p className="text-xs text-text-secondary mt-0.5">Nối các khái niệm văn học với mô tả</p>
                </button>
                <button
                  onClick={() => handleChallenge('quiz')}
                  disabled={isSending}
                  className="w-full p-4 bg-white border-2 border-primary-dark rounded-xl font-bold text-left hover:bg-primary/5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_#2D3436] transition-all disabled:opacity-50"
                >
                  <span className="text-sm font-black text-primary-dark">Trắc Nghiệm Nhanh</span>
                  <p className="text-xs text-text-secondary mt-0.5">Trả lời câu hỏi trắc nghiệm nhanh hơn đối thủ</p>
                </button>
              </div>

              <button
                onClick={() => setShowChallengeModal(false)}
                className="w-full px-4 py-2.5 bg-white border-2 border-border text-text-secondary font-bold rounded-xl text-sm hover:bg-gray-50 transition-all"
              >
                Huỷ bỏ
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
