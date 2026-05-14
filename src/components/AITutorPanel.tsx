'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Annotation {
  phrase: string;
  suggestion: string;
}

interface AnswerFeedback {
  questionLabel: string;
  isCorrect: boolean;
  feedback: string;
}

interface AITutorPanelProps {
  onSubmit: (data: { type: 'text'; text: string }) => void;
  isSubmitting: boolean;
  guidancePath: string;
}

// Extract reading comprehension blocks: "Câu X: ... \n [answer lines]"
// Returns array of {label, question, answer}
function parseReadingCompBlocks(text: string): { label: string; question: string; answer: string }[] {
  // Match patterns like "Câu 1:", "Câu 2:", etc.
  const blocks: { label: string; question: string; answer: string }[] = [];
  const regex = /(Câu\s+\d+[\.:][^\n]*\n)([\s\S]*?)(?=Câu\s+\d+[\.:][^\n]|\s*$)/gi;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const label = match[1].trim();
    const answer = match[2].trim();
    if (answer.length > 5) {
      blocks.push({ label, question: label, answer });
    }
  }
  return blocks;
}

export default function AITutorPanel({ onSubmit, isSubmitting, guidancePath }: AITutorPanelProps) {
  const [text, setText] = useState('');
  const [hint, setHint] = useState<string | null>(null);
  const [isLoadingHint, setIsLoadingHint] = useState(false);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [activeAnnotation, setActiveAnnotation] = useState<string | null>(null);
  const [isAnnotating, setIsAnnotating] = useState(false);
  const [guidanceContent, setGuidanceContent] = useState('');
  const [answerFeedbacks, setAnswerFeedbacks] = useState<AnswerFeedback[]>([]);
  const [checkedLabels, setCheckedLabels] = useState<Set<string>>(new Set());

  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const annotateTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastAnnotatedTextRef = useRef('');
  const textRef = useRef(text);

  useEffect(() => {
    textRef.current = text;
  }, [text]);

  // Fetch guidance content once on mount
  useEffect(() => {
    const fetchGuide = async () => {
      try {
        const res = await fetch(guidancePath);
        if (res.ok) {
          const mammoth = (await import('mammoth')).default;
          const buf = await res.arrayBuffer();
          const extracted = await mammoth.extractRawText({ arrayBuffer: buf });
          setGuidanceContent(extracted.value);
        }
      } catch (e) {
        console.warn('Could not load guidance:', e);
      }
    };
    fetchGuide();
  }, [guidancePath]);

  // Fetch hint on idle - structural dàn ý guidance
  const fetchHint = useCallback(async () => {
    if (isLoadingHint) return;
    setIsLoadingHint(true);
    try {
      const res = await fetch('/api/hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentText: textRef.current, guidanceContent }),
      });
      const data = await res.json();
      if (data.success && data.hint) setHint(data.hint);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingHint(false);
    }
  }, [guidanceContent, isLoadingHint]);

  // Check reading comprehension answers when new blocks appear
  const checkReadingCompAnswers = useCallback(async (currentText: string) => {
    const blocks = parseReadingCompBlocks(currentText);
    const newBlocks = blocks.filter(b => !checkedLabels.has(b.label));
    if (newBlocks.length === 0) return;

    for (const block of newBlocks) {
      try {
        const res = await fetch('/api/check-answer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            questionText: block.question,
            studentAnswer: block.answer,
            guidanceContent,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setAnswerFeedbacks(prev => [
            ...prev.filter(f => f.questionLabel !== block.label),
            {
              questionLabel: block.label,
              isCorrect: data.isCorrect,
              feedback: data.feedback,
            },
          ]);
          setCheckedLabels(prev => new Set([...prev, block.label]));
        }
      } catch (e) {
        console.error('Answer check error:', e);
      }
    }
  }, [checkedLabels, guidanceContent]);

  // Fetch annotations periodically
  const fetchAnnotations = useCallback(async () => {
    const currentText = textRef.current;
    if (currentText.length < 100) return;
    if (currentText === lastAnnotatedTextRef.current) return;

    setIsAnnotating(true);
    try {
      const res = await fetch('/api/annotate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentText }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.annotations)) {
        setAnnotations(data.annotations);
        lastAnnotatedTextRef.current = currentText;
      }
      // Also check reading comprehension answers during periodic run
      await checkReadingCompAnswers(currentText);
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnnotating(false);
    }
  }, [checkReadingCompAnswers]);

  // Idle detection: reset timer on every keystroke
  const handleKeyDown = () => {
    setHint(null);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(fetchHint, 10000);
  };

  // Periodic annotation every 30s
  useEffect(() => {
    annotateTimerRef.current = setInterval(fetchAnnotations, 30000);
    return () => {
      if (annotateTimerRef.current) clearInterval(annotateTimerRef.current);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [fetchAnnotations]);

  const handleSubmit = () => {
    if (!text.trim()) {
      alert('Vui lòng nhập bài làm');
      return;
    }
    onSubmit({ type: 'text', text: text.trim() });
  };

  const toggleAnnotation = (phrase: string) => {
    setActiveAnnotation(activeAnnotation === phrase ? null : phrase);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-yellow-100 border-b-2 border-primary-dark p-4 shrink-0">
        <h2 className="text-lg font-black text-primary-dark flex items-center gap-2">
          BÀI LÀM (CHẾ ĐỘ LUYỆN TẬP)
        </h2>
        <p className="text-xs text-amber-700 font-semibold mt-0.5">
          AI sẽ hướng dẫn bạn trong lúc viết — Kết quả không được lưu
        </p>
      </div>

      {/* Textarea */}
      <div className="flex-1 overflow-y-auto p-4 bg-[#FDFBF7] flex flex-col gap-3">
        <div className="relative">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={"Viết bài làm của bạn tại đây...\n\nAI sẽ theo dõi và gợi ý cho bạn trong lúc viết.\nNếu bạn viết câu trả lời đọc hiểu theo dạng 'Câu 1: [trả lời]', AI sẽ kiểm tra luôn."}
            className="paper-texture w-full min-h-[300px] rounded-xl border-2 border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none resize-none transition-all p-4 text-base"
            disabled={isSubmitting}
          />
        </div>

        {/* Idle Hint Banner – structural dàn ý */}
        <AnimatePresence>
          {(hint || isLoadingHint) && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="flex items-start gap-3 bg-[#FFF9C4] border-2 border-primary-dark rounded-xl px-4 py-3 shadow-[3px_3px_0_#2D3436]"
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-primary-dark uppercase mb-2">Hướng dẫn từ cô giáo</p>
                {isLoadingHint ? (
                  <div className="space-y-2">
                    <div className="h-3 bg-yellow-200 rounded animate-pulse w-full" />
                    <div className="h-3 bg-yellow-200 rounded animate-pulse w-5/6" />
                    <div className="h-3 bg-yellow-200 rounded animate-pulse w-4/5" />
                  </div>
                ) : (
                  <p className="text-sm text-amber-900 leading-relaxed whitespace-pre-wrap">{hint}</p>
                )}
              </div>
              <button
                onClick={() => setHint(null)}
                className="text-amber-700 hover:text-amber-900 font-black text-lg shrink-0 mt-0.5"
              >
                ×
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reading Comprehension Answer Feedback */}
        <AnimatePresence>
          {answerFeedbacks.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2"
            >
              <p className="text-xs font-black text-primary-dark uppercase">Kết quả đọc hiểu:</p>
              {answerFeedbacks.map((fb, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-3 p-3 rounded-xl border-2 ${
                    fb.isCorrect
                      ? 'bg-green-50 border-green-400'
                      : 'bg-red-50 border-red-400'
                  }`}
                >
                  <span className={`text-lg shrink-0 ${fb.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                    {fb.isCorrect ? '✓' : '✗'}
                  </span>
                  <div className="flex-1">
                    <p className="text-xs font-black mb-1 truncate">{fb.questionLabel}</p>
                    <p className="text-sm leading-relaxed text-text-primary">{fb.feedback}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Annotation chips – severe errors only */}
        <AnimatePresence>
          {annotations.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border-2 border-red-300 rounded-xl bg-red-50 p-3"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-black text-red-700 uppercase">
                  Lỗi cần sửa ({annotations.length})
                </span>
                {isAnnotating && (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-3 h-3 border-2 border-red-300 border-t-red-600 rounded-full"
                  />
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {annotations.map((a, i) => (
                  <div key={i} className="relative">
                    <button
                      onClick={() => toggleAnnotation(a.phrase)}
                      className="flex items-start text-left gap-1.5 px-3 py-1.5 bg-white text-red-700 text-sm font-bold border-2 border-red-500 rounded-lg shadow-[2px_2px_0_#EF4444] hover:-translate-y-0.5 transition-transform max-w-[280px]"
                    >
                      <span className="shrink-0 mt-0.5">🔍</span>
                      <span className="break-words line-clamp-2">{a.phrase}</span>
                    </button>

                    <AnimatePresence>
                      {activeAnnotation === a.phrase && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9, y: 4 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className="absolute bottom-full mb-2 left-0 z-50 w-64 bg-white border-2 border-primary-dark rounded-xl p-3 shadow-[4px_4px_0_#2D3436]"
                        >
                          <p className="text-xs font-black text-primary-dark mb-1 uppercase">Gợi ý sửa:</p>
                          <p className="text-sm text-text-primary leading-relaxed">{a.suggestion}</p>
                          <button
                            onClick={() => setActiveAnnotation(null)}
                            className="mt-2 text-xs text-text-secondary hover:text-primary"
                          >
                            Đóng lại ×
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Character count */}
        <p className="text-right text-xs text-text-light">{text.length} ký tự</p>
      </div>

      {/* Submit */}
      <div className="p-4 border-t-2 border-border bg-white/80 backdrop-blur-sm shrink-0">
        <motion.button
          whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
          whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
          onClick={handleSubmit}
          disabled={isSubmitting}
          className={`w-full py-3.5 rounded-xl font-black text-white text-base transition-all ${
            isSubmitting
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-amber-500 border-2 border-amber-800 shadow-[4px_4px_0_#92400E] hover:translate-y-[-2px]'
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
            'Nộp bài thử (Không lưu BXH)'
          )}
        </motion.button>
      </div>
    </div>
  );
}
