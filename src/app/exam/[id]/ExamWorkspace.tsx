'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { doc, getDoc, setDoc, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ExamInfo } from '@/lib/examData';
import DocxViewer from '@/components/DocxViewer';
import AnswerPanel from '@/components/AnswerPanel';
import AITutorPanel from '@/components/AITutorPanel';
import ScoreDetail, { type GradeResult } from '@/components/ScoreDetail';
import StickyNote from '@/components/StickyNote';
import { AnimatePresence, motion } from 'framer-motion';

export default function ExamWorkspace({ exam }: { exam: ExamInfo }) {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAIMode = searchParams.get('aiMode') === 'true';
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<GradeResult | null>(null);
  const [weaknessHistory, setWeaknessHistory] = useState<string[]>([]);
  const [showResult, setShowResult] = useState(false);

  const ANTI_CHEAT_ENABLED = false; // Toggle this to true to enable anti-cheat features

  // Exam constraints state
  const [isStarted, setIsStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(120 * 60); // 120 minutes in seconds
  const [startTime, setStartTime] = useState<number | null>(null);
  const isAutoSubmittingRef = useRef(false);

  // Load weakness history if user is logged in
  useEffect(() => {
    if (user) {
      getDoc(doc(db, 'weaknesses', user.uid)).then((snap) => {
        if (snap.exists()) {
          setWeaknessHistory(snap.data().weaknesses || []);
        }
      });
    }
  }, [user]);

  // Anti-cheat & Timer effects
  useEffect(() => {
    if (!isStarted || showResult || isSubmitting) return;

    // Timer
    const timerId = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerId);
          alert('Hết thời gian làm bài! Hệ thống tự động nộp.');
          triggerAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Fullscreen exit detection
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && !isAutoSubmittingRef.current && !showResult) {
        alert("Bạn đã thoát chế độ toàn màn hình. Bài thi đang tự động được nộp!");
        triggerAutoSubmit();
      }
    };

    // Anti copy/paste/right click
    const blockEvent = (e: Event) => e.preventDefault();

    if (ANTI_CHEAT_ENABLED) {
      document.addEventListener('fullscreenchange', handleFullscreenChange);
      document.addEventListener('contextmenu', blockEvent);
      document.addEventListener('copy', blockEvent);
      document.addEventListener('paste', blockEvent);
    }

    return () => {
      clearInterval(timerId);
      if (ANTI_CHEAT_ENABLED) {
        document.removeEventListener('fullscreenchange', handleFullscreenChange);
        document.removeEventListener('contextmenu', blockEvent);
        document.removeEventListener('copy', blockEvent);
        document.removeEventListener('paste', blockEvent);
      }
    };
  }, [isStarted, showResult, isSubmitting]);

  const startExam = async () => {
    try {
      if (ANTI_CHEAT_ENABLED) {
        await document.documentElement.requestFullscreen();
      }
      setIsStarted(true);
      setStartTime(Date.now());
      setTimeLeft(120 * 60);
    } catch (err) {
      alert("Trình duyệt từ chối chế độ Toàn màn hình. Vui lòng cấp quyền (F11/Tương tác) và thử lại.");
    }
  };

  const triggerAutoSubmit = () => {
    if (isAutoSubmittingRef.current) return;
    isAutoSubmittingRef.current = true;

    // Lấy dữ liệu text từ textarea do AnswerPanel không cung cấp ref ngược lên
    const textarea = document.querySelector('textarea');
    const textData = textarea ? textarea.value : '';

    handleSubmit({ type: 'text', text: textData });
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async (data: { type: 'text' | 'image'; text?: string; imageFile?: File }) => {
    if (!user) {
      alert('Vui lòng đăng nhập để chấm bài!');
      return;
    }

    let text = data.text?.trim();

    if (data.type === 'text' && !text) {
      alert('Cần có bài làm (text hoặc ảnh) để chấm điểm.\nVì bạn chưa viết gì, hệ thống sẽ tự động thoát.');
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(e => console.log(e));
      }
      setTimeout(() => router.back(), 100);
      isAutoSubmittingRef.current = false;
      return;
    }

    setIsSubmitting(true);

    try {
      let imageUrl = null;

      // Exit fullscreen explicitly before grading to show modals nicely
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(e => console.log(e));
      }

      // 1. Upload image if needed
      if (data.type === 'image' && data.imageFile) {
        const formData = new FormData();
        formData.append('image', data.imageFile);

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const uploadData = await uploadRes.json();
        if (!uploadData.success || !uploadData.urls?.length) {
          throw new Error('Lỗi khi tải ảnh lên máy chủ');
        }
        imageUrl = uploadData.urls[0];
      }

      // 2. Fetch grading guide (hướng dẫn chấm) content
      const guideRes = await fetch(exam.huongdanchamPath);
      let guidanceContent = '';
      if (guideRes.ok) {
        const mammoth = (await import('mammoth')).default;
        const arrayBuffer = await guideRes.arrayBuffer();
        const extracted = await mammoth.extractRawText({ arrayBuffer });
        guidanceContent = extracted.value;
      }

      // 3. Call grading API
      const gradeRes = await fetch('/api/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          imageUrl,
          guidanceContent,
          weaknesses: weaknessHistory,
          examId: exam.id,
          userId: user.uid,
        }),
      });

      const gradeData = await gradeRes.json();

      if (!gradeData.success) {
        throw new Error(gradeData.error || 'Lỗi chấm bài');
      }

      const scoreResult = gradeData.result as GradeResult;
      setResult(scoreResult);
      setShowResult(true);

      // Validate restrictions: > 5 mins AND >= 3.0 pts
      const timeSpentMs = startTime ? Date.now() - startTime : 0;
      const isTimeValid = timeSpentMs >= 5 * 60 * 1000;
      const isScoreValid = scoreResult.tong_diem >= 3.0;

      if (isAIMode || !isTimeValid || !isScoreValid) {
        if (!isAIMode && (!isTimeValid || !isScoreValid)) {
          alert(`Bạn đang làm bài một cách chống đối! Hãy làm lại một cách nghiêm túc!`);
        }
        return; // Skip saving for both AI mode and spam filter
      }

      // 4. Update Firestore progress
      const score = scoreResult.tong_diem;

      const progressRef = doc(db, 'progress', `${user.uid}_${exam.id}`);
      const pgSnap = await getDoc(progressRef);

      let newHighest = score;
      if (pgSnap.exists()) {
        const currentHighest = pgSnap.data().highestScore || 0;
        newHighest = Math.max(currentHighest, score);
      }

      await setDoc(progressRef, {
        userId: user.uid,
        examId: exam.id,
        grade: exam.grade,
        highestScore: newHighest,
        status: newHighest >= 8 ? 'green' : newHighest >= 5 ? 'yellow' : 'red',
        updatedAt: serverTimestamp()
      });

      // Save the full submission for admin review
      const submissionRef = doc(db, 'submissions', `${user.uid}_${exam.id}`);
      await setDoc(submissionRef, {
        examId: exam.id,
        examTitle: exam.title,
        userId: user.uid,
        userName: user.displayName || 'Ẩn danh',
        userEmail: user.email || '',
        userPhoto: user.photoURL || '',
        submissionType: data.type,
        submissionText: data.type === 'text' ? text : null,
        submissionImageUrl: data.type === 'image' ? imageUrl : null,
        score: score,
        gradeResult: scoreResult,
        submittedAt: serverTimestamp()
      });

      // 5. Update overall user stats
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const udata = userSnap.data();
        await setDoc(userRef, {
          ...udata,
          examsDone: (udata.examsDone || 0) + 1,
          totalScore: (udata.totalScore || 0) + score
        });
      }

      // 6. Update weaknesses
      if (scoreResult.phan_tich_diem_yeu.length > 0) {
        const weaknessesRef = doc(db, 'weaknesses', user.uid);
        const weakSnap = await getDoc(weaknessesRef);
        if (!weakSnap.exists()) {
          await setDoc(weaknessesRef, {
            userId: user.uid,
            weaknesses: scoreResult.phan_tich_diem_yeu,
            updatedAt: serverTimestamp()
          });
        } else {
          await setDoc(weaknessesRef, {
            weaknesses: arrayUnion(...scoreResult.phan_tich_diem_yeu),
            updatedAt: serverTimestamp()
          }, { merge: true });
        }
      }

    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Đã có lỗi xảy ra');
    } finally {
      setIsSubmitting(false);
      isAutoSubmittingRef.current = false;
    }
  };

  if (!isStarted) {
    return (
      <div className="h-[calc(100vh-72px)] bg-bg-main flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`bg-white p-8 rounded-2xl border-4 shadow-[8px_8px_0_#2D3436] max-w-md text-center ${
            isAIMode ? 'border-amber-500' : 'border-primary-dark'
          }`}
        >
          <div className={`w-20 h-20 mx-auto text-white rounded-full flex items-center justify-center text-4xl mb-6 shadow-inner border-4 ${
            isAIMode ? 'bg-amber-400 border-amber-700' : 'bg-primary border-primary-dark'
          }`}>
            {isAIMode ? '📖' : '📝'}
          </div>
          <h2 className={`text-2xl font-black mb-4 drop-shadow-[2px_2px_0_#FDCB6E] ${
            isAIMode ? 'text-amber-700' : 'text-primary-dark'
          }`}>
            {isAIMode ? 'Chế Độ Luyện Tập Với AI' : 'Chuẩn Bị Làm Bài'}
          </h2>
          <div className="text-text-secondary mb-6 space-y-2 text-sm text-left bg-gray-50 p-4 border-2 border-border rounded-xl">
            {isAIMode ? (
              <>
                <p>• AI sẽ <strong>gợi ý định hướng viết</strong> sau 10 giây không gõ.</p>
                <p>• Mỗi 30 giây AI đọc bài và <strong>đánh dấu lỗi</strong> để bạn xem lại.</p>
                <p className="text-amber-600 font-bold">• Kết quả sẽ KHÔNG được lưu và không tính BXH.</p>
              </>
            ) : (
              <>
                <p>• Màn hình sẽ chuyển sang chế độ <strong>Toàn màn hình</strong>.</p>
                <p>• Thời gian làm bài: <strong>120 phút</strong>.</p>
                <p className="text-red-500 font-bold">• Nhấn ESC hoặc thoát toàn màn hình sẽ tự động nộp bài!</p>
                <p>• Cấm copy/paste và click chuột phải.</p>
              </>
            )}
          </div>
          <button
            onClick={startExam}
            className={`w-full px-8 py-3.5 text-white text-lg font-black rounded-xl border-2 shadow-[4px_4px_0_#2D3436] hover:translate-y-[-2px] transition-transform ${
              isAIMode
                ? 'bg-amber-500 border-amber-800'
                : 'bg-primary border-primary-dark'
            }`}
          >
            {isAIMode ? 'BẮT ĐẦU LUYỆN TẬP' : 'BẮT ĐẦU VÀO THI'}
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden flex flex-col md:flex-row bg-bg-main">
      {/* Timer Bar (Top Fixed on mobile, integrated on Desktop) */}
      <div className="absolute top-0 right-1/2 translate-x-1/2 z-50 mt-4 hidden md:flex items-center gap-3">
        <div className="bg-white border-2 border-primary-dark rounded-full px-6 py-2 shadow-[4px_4px_0_#2D3436] font-black text-xl text-primary-dark">
          ⏱ {formatTime(timeLeft)}
        </div>
      </div>

      {/* Left panel: DocxViewer */}
      <div className="h-[40vh] md:h-full md:flex-1 border-b-4 md:border-b-0 md:border-r-4 border-primary-dark bg-white overflow-hidden relative shadow-inner shrink-0">
        <div className="absolute top-0 inset-x-0 h-14 bg-white/95 backdrop-blur border-b-2 border-border flex items-center px-4 z-10 shadow-sm md:justify-between">
          <button
            onClick={() => {
              if (confirm('Thoát sẽ tự động nộp bài của bạn. Tiếp tục?')) {
                document.exitFullscreen().catch(() => { });
              }
            }}
            className="text-text-secondary hover:text-primary mr-4 font-black text-xs md:text-sm border-2 border-border px-3 py-1.5 rounded-lg bg-gray-50 shadow-[2px_2px_0_#DFE6E9]"
          >
            ← NỘP SỚM & THOÁT
          </button>
          <div className="md:hidden font-black text-primary-dark px-3 py-1 bg-gray-100 rounded-lg border-2 border-border">
            {formatTime(timeLeft)}
          </div>
        </div>
        <div className="pt-14 h-full overflow-hidden">
          <DocxViewer filePath={exam.dethiPath} />
        </div>
      </div>

      {/* Right panel: AnswerPanel / AITutorPanel */}
      <div className="flex-1 md:flex-none w-full md:w-[45%] lg:w-[40%] xl:w-[35%] md:h-full shadow-xl z-20 overflow-hidden flex flex-col">
        {isAIMode ? (
          <>
            <div className="bg-amber-400 border-b-4 border-amber-800 px-4 py-2 shrink-0 flex items-center gap-2">
              <span className="text-amber-900 font-black text-sm uppercase">CHÊ ĐÔ LUYÊN TÂP — Không lưu kết quả</span>
            </div>
            <AITutorPanel
              onSubmit={(data) => handleSubmit(data)}
              isSubmitting={isSubmitting}
              guidancePath={exam.huongdanchamPath}
            />
          </>
        ) : (
          <AnswerPanel onSubmit={handleSubmit} isSubmitting={isSubmitting} />
        )}
      </div>

      {/* Result Overlays */}
      <AnimatePresence>
        {showResult && result && (
          <ScoreDetail result={result} onClose={() => setShowResult(false)} />
        )}
      </AnimatePresence>

      {result && result.sticky_note && (
        <StickyNote
          message={result.sticky_note}
          weaknesses={result.phan_tich_diem_yeu}
          onConfirm={() => {
            if (document.fullscreenElement) {
              document.exitFullscreen().catch(e => console.log(e));
            }
            router.push('/');
          }}
          confirmText="Hoàn thành & Về trang chủ"
        />
      )}
    </div>
  );
}
