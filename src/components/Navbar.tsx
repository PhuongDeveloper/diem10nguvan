'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/AuthContext';
import { useState } from 'react';
import { FcGoogle } from 'react-icons/fc';

export default function Navbar() {
  const { user, signInWithGoogle, signOut, loading } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);

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
                Thi Văn Quán
              </h1>
              <p className="text-[10px] text-text-secondary -mt-0.5">
                Luyện thi Ngữ Văn cùng AI
              </p>
            </div>
            <div className="sm:hidden">
              <h1 className="text-xl font-black text-primary-dark drop-shadow-[2px_2px_0_#FDCB6E] tracking-tight">
                TVQ
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
                  className="flex items-center gap-2 ml-2"
                >
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
                    </div>
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
