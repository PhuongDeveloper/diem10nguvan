// ============================================================
// /api/check-answer — API kiểm tra câu trả lời đọc hiểu
// ============================================================
// LUỒNG CŨ (Gemini): model.generateContent(prompt)
// LUỒNG MỚI (DeepSeek): callDeepSeekAPI(prompt) → extractJSON()
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { callDeepSeekAPI, extractJSON } from '@/lib/deepseek';

export interface AnswerCheck {
  questionLabel: string;
  isCorrect: boolean;
  feedback: string;
}

export async function POST(request: NextRequest) {
  try {
    const { questionText, studentAnswer, guidanceContent } = await request.json();

    if (!studentAnswer?.trim() || !questionText?.trim()) {
      return NextResponse.json({ success: false, error: 'Thiếu dữ liệu' }, { status: 400 });
    }

    const prompt = `Bạn là giáo viên Ngữ Văn THPT chấm câu hỏi đọc hiểu nhanh.

HƯỚNG DẪN CHẤM (nếu có):
${guidanceContent || 'Áp dụng tiêu chuẩn Ngữ Văn THPT.'}

CÂU HỎI:
${questionText}

CÂU TRẢ LỜI CỦA HỌC SINH:
${studentAnswer}

Hãy đánh giá câu trả lời này. Trả về JSON thuần túy (không có markdown):
{
  "isCorrect": true/false,
  "feedback": "nhận xét ngắn gọn 1-2 câu bằng tiếng Việt, nếu sai thì gợi ý hướng trả lời đúng"
}`;

    // [MỚI] Gọi DeepSeek thay vì Gemini
    const responseText = await callDeepSeekAPI(prompt);

    let checkResult: { isCorrect: boolean; feedback: string };
    try {
      checkResult = extractJSON(responseText) as { isCorrect: boolean; feedback: string };
    } catch {
      checkResult = { isCorrect: false, feedback: 'Không thể đánh giá tự động, hãy xem lại câu trả lời.' };
    }

    return NextResponse.json({ success: true, ...checkResult });
  } catch (error) {
    console.error('Check answer error:', error);
    return NextResponse.json(
      { error: 'Lỗi kiểm tra câu trả lời', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
