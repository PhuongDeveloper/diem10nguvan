'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/AuthContext';
import { useState, useEffect } from 'react';
import { FcGoogle } from 'react-icons/fc';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function Navbar() {
  const { user, signInWithGoogle, signOut, loading } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const [stars, setStars] = useState(0);

  // Listen to star count in real-time
  useEffect(() => {
    if (!user) {
      setStars(0);
      return;
    }
    const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists()) {
        setStars(snap.data().stars || 0);
      }
    });
    return unsub;
  }, [user]);

  return (
    <motion.nav
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 120, damping: 20 }}
      className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 border-b border-border shadow-sm"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[72px]">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <motion.div
              whileHover={{ rotate: [0, -10, 10, 0] }}
              transition={{ duration: 0.5 }}
              className="w-10 h-10 rounded-xl bg-primary border-2 border-primary-dark flex items-center justify-center text-white text-lg font-black shadow-[2px_2px_0_#2D3436]"
            >
              文
            </motion.div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-black text-primary-dark drop-shadow-[2px_2px_0_#FDCB6E]">
                Ngữ văn số hoá
              </h1>
              <p className="text-[10px] text-text-secondary -mt-0.5">
                Luyện thi Ngữ Văn cùng AI
              </p>
            </div>
            <div className="sm:hidden">
              <h1 className="text-xl font-black text-primary-dark drop-shadow-[2px_2px_0_#FDCB6E] tracking-tight">
                NVSH
              </h1>
            </div>
          </Link>

          {/* Nav Links */}
          <div className="flex items-center gap-1 sm:gap-2">
            <Link href="/">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-2 sm:px-4 py-2 text-sm font-semibold text-text-secondary hover:text-primary transition-colors rounded-lg hover:bg-primary/5"
              >
                Đề thi
              </motion.button>
            </Link>
            <Link href="/minigame">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-2 sm:px-4 py-2 text-sm font-semibold text-text-secondary hover:text-primary transition-colors rounded-lg hover:bg-primary/5"
              >
                Minigame
              </motion.button>
            </Link>

            {/* Auth */}
            {loading ? (
              <div className="w-9 h-9 rounded-full bg-border animate-pulse" />
            ) : user ? (
              <div className="relative">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex items-center gap-1.5 ml-2"
                >
                  {/* Star badge */}
                  <div className="flex items-center gap-0.5 bg-amber-50 border border-amber-300 rounded-lg px-1.5 py-0.5">
                    <svg className="w-3.5 h-3.5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span className="text-xs font-black text-amber-700">{stars}</span>
                  </div>
                  <img
                    src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'U')}&background=6C5CE7&color=fff`}
                    alt="avatar"
                    className="w-9 h-9 rounded-full border-2 border-primary shadow-md"
                  />
                </motion.button>
                {showDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-border py-2 z-50"
                  >
                    <div className="px-4 py-2 border-b border-border">
                      <p className="font-semibold text-sm truncate">
                        {user.displayName}
                      </p>
                      <p className="text-xs text-text-secondary truncate">
                        {user.email}
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        <svg className="w-3.5 h-3.5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <span className="text-xs font-bold text-amber-700">{stars} sao</span>
                      </div>
                    </div>
                    <Link
                      href={`/profile/${user.uid}`}
                      onClick={() => setShowDropdown(false)}
                      className="block w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-gray-50 transition-colors"
                    >
                      Hồ sơ của tôi
                    </Link>
                    <button
                      onClick={() => { signOut(); setShowDropdown(false); }}
                      className="w-full text-left px-4 py-2 text-sm text-accent-red hover:bg-red-50 transition-colors"
                    >
                      Đăng xuất
                    </button>
                  </motion.div>
                )}
              </div>
            ) : (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={signInWithGoogle}
                className="ml-1 sm:ml-2 px-3 sm:px-5 py-2 flex items-center gap-1 sm:gap-2 bg-white border-2 border-primary-dark text-primary-dark text-xs sm:text-sm font-black rounded-xl shadow-[4px_4px_0_#2D3436] hover:translate-y-[-2px] transition-transform hover:shadow-[6px_6px_0_#2D3436]"
              >
                <FcGoogle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                <span className="hidden sm:inline">Đăng nhập</span>
                <span className="sm:hidden">Login</span>
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </motion.nav>
  );
}
