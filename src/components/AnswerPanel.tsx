'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CameraCapture from './CameraCapture';

interface AnswerPanelProps {
  onSubmit: (data: { type: 'text' | 'image'; text?: string; imageFile?: File }) => void;
  isSubmitting: boolean;
}

type AnswerMode = 'text' | 'image';

export default function AnswerPanel({ onSubmit, isSubmitting }: AnswerPanelProps) {
  const [mode, setMode] = useState<AnswerMode>('text');
  const [text, setText] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);

  const handleSubmit = () => {
    if (mode === 'text') {
      if (!text.trim()) {
        alert('Vui lòng nhập bài làm');
        return;
      }
      onSubmit({ type: 'text', text: text.trim() });
    } else {
      if (!imageFile) {
        alert('Vui lòng chụp ảnh bài làm');
        return;
      }
      onSubmit({ type: 'image', imageFile });
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header – always visible */}
      <div className="bg-primary/10 px-4 py-3 border-b-2 border-border shrink-0">
        <h2 className="text-base font-black text-text-primary">Bài làm của bạn</h2>
        <p className="text-xs text-text-secondary">Chọn hình thức nộp bài bên dưới</p>
      </div>

      {/* Mode Tabs – always visible */}
      <div className="flex border-b-2 border-border shrink-0">
        {[
          { key: 'text' as AnswerMode, label: 'Đánh máy', desc: 'Gõ bài làm' },
          { key: 'image' as AnswerMode, label: 'Chụp ảnh', desc: 'Chụp bài viết tay' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setMode(tab.key)}
            className={`flex-1 py-2.5 px-2 text-center transition-all relative ${
              mode === tab.key
                ? 'text-primary bg-primary/5'
                : 'text-text-secondary hover:bg-gray-50'
            }`}
          >
            <span className="text-sm font-bold block">{tab.label}</span>
            <span className="text-[10px] text-text-light">{tab.desc}</span>
            {mode === tab.key && (
              <motion.div
                layoutId="answer-tab"
                className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full"
              />
            )}
          </button>
        ))}
      </div>

      {/* Device recommendation */}
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        className="mx-4 mt-3"
      >
        <div className="bg-accent-blue/10 border border-accent-blue/30 rounded-lg p-2.5 text-xs text-blue-700">
          {mode === 'text' ? (
            <><strong>Mẹo:</strong> Phù hợp với laptop/máy tính bàn. Trên điện thoại có thể khó nhập văn bản dài.</>
          ) : (
            <><strong>Mẹo:</strong> Dùng camera điện thoại để chụp bài viết tay rõ nét hơn. Camera laptop thường mờ, khó chụp.</>
          )}
        </div>
      </motion.div>

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto p-4 min-h-0">
        <AnimatePresence mode="wait">
          {mode === 'text' ? (
            <motion.div
              key="text"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex flex-col h-full"
            >
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={"Viết bài làm của bạn tại đây...\n\nHãy trình bày rõ ràng, có dẫn chứng và phân tích cụ thể."}
                className="paper-texture w-full flex-1 min-h-[320px] rounded-xl border-2 border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none resize-none transition-all p-3 text-base"
              />
              <p className="text-right text-xs text-text-light mt-1.5">{text.length} ký tự</p>
            </motion.div>
          ) : (
            <motion.div
              key="image"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <CameraCapture onImageCaptured={(file) => setImageFile(file)} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Submit Button – always pinned at bottom */}
      <div className="p-4 border-t-2 border-border bg-white shrink-0 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
        <motion.button
          whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
          whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
          onClick={handleSubmit}
          disabled={isSubmitting}
          className={`w-full py-4 rounded-xl font-black text-white text-base transition-all ${
            isSubmitting
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-primary border-2 border-primary-dark shadow-[4px_4px_0_#2D3436] hover:translate-y-[-2px]'
          }`}
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
              />
              AI đang chấm bài...
            </span>
          ) : (
            'NỘP BÀI & CHẤM BẰNG AI'
          )}
        </motion.button>
      </div>
    </div>
  );
}
