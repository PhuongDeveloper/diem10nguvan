'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, query, getDocs, doc, setDoc, getDoc, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { GradeResult } from '@/components/ScoreDetail';

interface Submission {
  id: string; // userId_examId
  examId: string;
  examTitle: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhoto: string;
  submissionType: 'text' | 'image';
  submissionText: string | null;
  submissionImageUrl: string | null;
  score: number;
  gradeResult: GradeResult;
  submittedAt: any;
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);

  // Navigation state
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);

  // Edit score state
  const [editingScore, setEditingScore] = useState<number | null>(null);
  const [isSavingScore, setIsSavingScore] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === '@Noitru2026') {
      setIsAuthenticated(true);
      fetchSubmissions();
    } else {
      setError('Sai mật khẩu!');
    }
  };

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'submissions'), orderBy('submittedAt', 'desc'));
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Submission));
      setSubmissions(data);
    } catch (err) {
      console.error('Lỗi khi tải bài làm:', err);
      alert('Không thể tải bài làm. Hãy chắc chắn Firestore Rules đã cho phép.');
    } finally {
      setLoading(false);
    }
  };

  const updateScore = async (submission: Submission) => {
    if (editingScore === null || isSavingScore) return;
    if (editingScore < 0 || editingScore > 10) {
      alert('Điểm phải từ 0 đến 10');
      return;
    }
    
    if (!confirm(`Bạn có chắc muốn sửa điểm của học sinh ${submission.userName} thành ${editingScore}?`)) return;

    setIsSavingScore(true);
    try {
      const delta = editingScore - submission.score;

      // 1. Update submissions collection
      const subRef = doc(db, 'submissions', submission.id);
      await setDoc(subRef, { score: editingScore }, { merge: true });

      // 2. Update progress collection (highestScore)
      const progRef = doc(db, 'progress', submission.id);
      const progSnap = await getDoc(progRef);
      if (progSnap.exists()) {
        const udata = progSnap.data();
        let newHighest = udata.highestScore;
        // If we are raising the score above current highest, or lowering it (and it was the only attempt)
        // Since we only store 1 submission per exam per user in this simple system, highestScore equals this score
        newHighest = editingScore; 
        await setDoc(progRef, { 
          highestScore: newHighest,
          status: newHighest >= 8 ? 'green' : newHighest >= 5 ? 'yellow' : 'red'
        }, { merge: true });
      }

      // 3. Update user totalScore
      const userRef = doc(db, 'users', submission.userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        await setDoc(userRef, {
          totalScore: (userData.totalScore || 0) + delta
        }, { merge: true });
      }

      // Update local state
      setSubmissions(prev => prev.map(s => s.id === submission.id ? { ...s, score: editingScore } : s));
      alert('Đã cập nhật điểm thành công!');
      setSelectedSubmissionId(null); // Go back to student list
    } catch (err) {
      console.error(err);
      alert('Lỗi cập nhật điểm!');
    } finally {
      setIsSavingScore(false);
      setEditingScore(null);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="h-[calc(100vh-72px)] bg-bg-main flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded-2xl border-4 border-primary-dark shadow-[8px_8px_0_#2D3436] max-w-sm w-full">
          <div className="w-16 h-16 mx-auto bg-primary text-white rounded-full flex items-center justify-center text-3xl mb-6 shadow-inner border-2 border-primary-dark">
            🔒
          </div>
          <h2 className="text-2xl font-black mb-6 text-primary-dark text-center">Admin Login</h2>
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(''); }}
            placeholder="Nhập mật khẩu"
            className="w-full px-4 py-3 mb-4 border-2 border-border rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-center font-bold tracking-widest"
          />
          {error && <p className="text-red-500 text-sm mb-4 font-bold text-center">{error}</p>}
          <button type="submit" className="w-full px-4 py-3 bg-primary text-white font-black rounded-xl border-2 border-primary-dark shadow-[4px_4px_0_#2D3436] hover:-translate-y-1 transition-transform">
            MỞ KHÓA
          </button>
        </form>
      </div>
    );
  }

  // --- UI Level 1: Exam List ---
  if (!selectedExamId) {
    // Group submissions by examId
    const examsMap = new Map<string, { title: string, count: number }>();
    submissions.forEach(s => {
      if (!examsMap.has(s.examId)) examsMap.set(s.examId, { title: s.examTitle, count: 0 });
      examsMap.get(s.examId)!.count++;
    });
    
    const exams = Array.from(examsMap.entries()).map(([id, data]) => ({ id, ...data }));

    return (
      <div className="max-w-4xl mx-auto p-6 my-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-black text-primary-dark">Quản lý bài làm</h1>
          <button onClick={fetchSubmissions} className="px-4 py-2 bg-white border-2 border-border rounded-xl font-bold hover:border-primary hover:text-primary transition-colors flex items-center gap-2">
            🔄 Làm mới
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div></div>
        ) : exams.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border-4 border-primary-dark shadow-[8px_8px_0_#2D3436]">
            <p className="text-xl font-bold text-text-secondary">Chưa có bài làm nào.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {exams.map(e => (
              <motion.button
                key={e.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedExamId(e.id)}
                className="bg-white p-6 rounded-2xl border-2 border-primary-dark shadow-[4px_4px_0_#2D3436] text-left hover:bg-primary/5 transition-colors"
              >
                <h3 className="text-lg font-black text-primary-dark mb-2">{e.title}</h3>
                <div className="inline-block px-3 py-1 bg-amber-100 text-amber-800 font-bold text-xs rounded-lg border border-amber-300">
                  {e.count} bài nộp
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // --- UI Level 2: Student List ---
  if (!selectedSubmissionId) {
    const examSubmissions = submissions.filter(s => s.examId === selectedExamId);
    const examTitle = examSubmissions[0]?.examTitle || selectedExamId;

    return (
      <div className="max-w-4xl mx-auto p-6 my-8">
        <button onClick={() => setSelectedExamId(null)} className="mb-6 px-4 py-2 bg-white border-2 border-border text-text-secondary font-bold rounded-xl hover:bg-gray-50 flex items-center gap-2">
          ← Quay lại danh sách đề
        </button>
        
        <h2 className="text-2xl font-black text-primary-dark mb-6">Đề: {examTitle}</h2>

        <div className="bg-white rounded-2xl border-4 border-primary-dark shadow-[8px_8px_0_#2D3436] overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-primary text-white">
              <tr>
                <th className="p-4 font-black">Học Sinh</th>
                <th className="p-4 font-black">Điểm AI</th>
                <th className="p-4 font-black">Thời Gian</th>
                <th className="p-4 font-black">Tuỳ chỉnh</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-gray-100">
              {examSubmissions.map(s => {
                const date = s.submittedAt?.toDate ? s.submittedAt.toDate() : new Date();
                return (
                  <tr key={s.id} className="hover:bg-primary/5 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <img src={s.userPhoto || `https://ui-avatars.com/api/?name=${s.userName}`} alt="" className="w-10 h-10 rounded-full border border-gray-300" />
                        <div>
                          <p className="font-bold text-sm">{s.userName}</p>
                          <p className="text-xs text-text-light">{s.userEmail}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 font-black text-primary">{s.score}</td>
                    <td className="p-4 text-xs text-text-secondary">{date.toLocaleString('vi-VN')}</td>
                    <td className="p-4">
                      <button 
                        onClick={() => setSelectedSubmissionId(s.id)}
                        className="px-4 py-1.5 bg-white border-2 border-primary text-primary font-bold rounded-lg hover:bg-primary hover:text-white transition-colors text-sm"
                      >
                        Chấm lại
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // --- UI Level 3: Submission Detail ---
  const currentSub = submissions.find(s => s.id === selectedSubmissionId);
  if (!currentSub) return null;

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 my-8">
      <button onClick={() => { setSelectedSubmissionId(null); setEditingScore(null); }} className="mb-6 px-4 py-2 bg-white border-2 border-border text-text-secondary font-bold rounded-xl hover:bg-gray-50 flex items-center gap-2">
        ← Quay lại danh sách lớp
      </button>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: Student Work */}
        <div className="flex-[3]">
          <div className="bg-white rounded-2xl border-4 border-primary-dark shadow-[8px_8px_0_#2D3436] p-6 mb-6">
            <h3 className="text-xl font-black text-primary-dark mb-4 border-b-2 border-border pb-2">
              Bài làm của: {currentSub.userName}
            </h3>
            
            {currentSub.submissionType === 'image' && currentSub.submissionImageUrl ? (
              <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50 p-2">
                <img src={currentSub.submissionImageUrl} alt="Bài làm" className="w-full h-auto object-contain max-h-[600px] rounded-lg border border-gray-200" />
              </div>
            ) : (
              <div className="bg-gray-50 p-4 border border-gray-200 rounded-xl whitespace-pre-wrap font-serif text-gray-800 leading-relaxed min-h-[300px]">
                {currentSub.submissionText || 'Không có nội dung text'}
              </div>
            )}
          </div>
        </div>

        {/* Right: AI Grade & Re-grade panel */}
        <div className="flex-[2] space-y-6">
          {/* Re-grade Card */}
          <div className="bg-amber-50 rounded-2xl border-4 border-amber-600 shadow-[6px_6px_0_#D97706] p-6">
            <h3 className="text-lg font-black text-amber-900 mb-4">Chấm Lại (Giáo Viên)</h3>
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1">
                <p className="text-xs font-bold text-amber-700 uppercase mb-1">Điểm AI chấm</p>
                <div className="text-2xl font-black text-gray-500 line-through">{currentSub.score}</div>
              </div>
              <div className="text-4xl">➔</div>
              <div className="flex-1">
                <p className="text-xs font-bold text-green-700 uppercase mb-1">Điểm mới</p>
                <input
                  type="number"
                  min="0" max="10" step="0.5"
                  value={editingScore === null ? currentSub.score : editingScore}
                  onChange={(e) => setEditingScore(Number(e.target.value))}
                  className="w-24 px-3 py-2 text-2xl font-black text-green-700 bg-white border-2 border-green-600 rounded-xl outline-none"
                />
              </div>
            </div>
            <button
              onClick={() => updateScore(currentSub)}
              disabled={isSavingScore || editingScore === null || editingScore === currentSub.score}
              className="w-full px-4 py-3 bg-green-600 text-white font-black rounded-xl border-2 border-green-800 shadow-[4px_4px_0_#065F46] hover:-translate-y-1 transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isSavingScore ? 'ĐANG LƯU...' : 'LƯU ĐIỂM SỬA'}
            </button>
          </div>

          {/* AI Feedback View */}
          <div className="bg-white rounded-2xl border-4 border-primary-dark shadow-[6px_6px_0_#2D3436] p-6">
            <h3 className="text-lg font-black text-primary-dark mb-4 pb-2 border-b-2 border-border">Chi tiết đánh giá của AI</h3>
            
            <div className="space-y-4">
              {currentSub.gradeResult?.chi_tiet_diem?.map((item, index) => (
                <div key={index} className="border-l-4 border-primary pl-3">
                  <h4 className="font-bold text-sm mb-1">{item.cau} ({item.diem}/{item.diem_toi_da}đ)</h4>
                  <p className="text-sm text-gray-600 mb-1 leading-relaxed"><span className="font-semibold text-gray-800">Nhận xét:</span> {item.nhan_xet}</p>
                </div>
              ))}
            </div>

            <div className="mt-6">
              <h4 className="font-bold text-red-600 mb-2">Điểm yếu:</h4>
              <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                {currentSub.gradeResult?.phan_tich_diem_yeu?.map((weak, i) => (
                  <li key={i}>{weak}</li>
                ))}
              </ul>
            </div>
            
             <div className="mt-4 pt-4 border-t border-gray-100">
              <h4 className="font-bold text-primary mb-2">Lời khuyên:</h4>
              <p className="text-sm text-gray-700">{currentSub.gradeResult?.sticky_note}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
