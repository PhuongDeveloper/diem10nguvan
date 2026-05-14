'use client';

import { motion, AnimatePresence } from 'framer-motion';

export interface GradeResult {
  tong_diem: number;
  chi_tiet_diem: Array<{
    cau: string;
    diem: number;
    diem_toi_da: number;
    nhan_xet: string;
  }>;
  loi_dien_dat: string[];
  phan_tich_diem_yeu: string[];
  sticky_note: string;
}

interface ScoreDetailProps {
  result: GradeResult;
  onClose: () => void;
}

export default function ScoreDetail({ result, onClose }: ScoreDetailProps) {
  const scoreColor =
    result.tong_diem >= 8
      ? 'text-accent-green'
      : result.tong_diem >= 5
        ? 'text-status-yellow'
        : 'text-accent-red';

  const scoreBg =
    result.tong_diem >= 8
      ? 'bg-green-500 border-green-700'
      : result.tong_diem >= 5
        ? 'bg-yellow-400 border-yellow-600'
        : 'bg-red-500 border-red-700';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.8, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.8, y: 50 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden"
      >
        {/* Header with total score */}
        <div className={`${scoreBg} border-b-4 p-6 text-white text-center`}>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          >
            <p className="text-sm opacity-90 mb-1">Tổng điểm</p>
            <p className="text-6xl font-extrabold">
              {result.tong_diem.toFixed(1)}
            </p>
            <p className="text-sm opacity-80 mt-1">/ 10.0</p>
          </motion.div>
        </div>

        <div className="overflow-y-auto max-h-[calc(85vh-200px)] p-6 space-y-6">
          {/* Chi tiết điểm */}
          <div>
            <h3 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-2">
              Chi tiết điểm từng câu
            </h3>
            <div className="space-y-2">
              {result.chi_tiet_diem.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.05 }}
                  className="bg-gray-50 rounded-xl p-3 border border-border/50"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold">{item.cau}</span>
                    <span
                      className={`text-sm font-bold ${
                        item.diem >= item.diem_toi_da * 0.8
                          ? 'text-accent-green'
                          : item.diem >= item.diem_toi_da * 0.5
                            ? 'text-status-yellow'
                            : 'text-accent-red'
                      }`}
                    >
                      {item.diem}/{item.diem_toi_da}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden mb-1.5">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{
                        width: `${(item.diem / item.diem_toi_da) * 100}%`,
                      }}
                      transition={{ delay: 0.5 + i * 0.1, duration: 0.5 }}
                      className={`h-full rounded-full border-b border-black/10 ${
                        item.diem >= item.diem_toi_da * 0.8
                          ? 'bg-green-500'
                          : item.diem >= item.diem_toi_da * 0.5
                            ? 'bg-yellow-400'
                            : 'bg-red-500'
                      }`}
                    />
                  </div>
                  <p className="text-xs text-text-secondary">{item.nhan_xet}</p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Lỗi diễn đạt */}
          {result.loi_dien_dat.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-2">
                Lỗi diễn đạt
              </h3>
              <div className="bg-red-50 rounded-xl p-4 border border-red-100">
                <ul className="space-y-1.5">
                  {result.loi_dien_dat.map((loi, i) => (
                    <li
                      key={i}
                      className="text-sm text-red-700 flex items-start gap-2"
                    >
                      <span className="text-red-400 mt-0.5">•</span>
                      {loi}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Phân tích điểm yếu */}
          {result.phan_tich_diem_yeu.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-2">
                Điểm yếu cần cải thiện
              </h3>
              <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                <ul className="space-y-1.5">
                  {result.phan_tich_diem_yeu.map((yeu, i) => (
                    <li
                      key={i}
                      className="text-sm text-amber-700 flex items-start gap-2"
                    >
                      <span className="text-amber-400 mt-0.5">•</span>
                      {yeu}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex justify-end">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClose}
            className="px-6 py-2.5 bg-primary border-2 border-primary-dark text-white rounded-xl font-black shadow-[4px_4px_0_#2D3436]"
          >
            Đóng
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
