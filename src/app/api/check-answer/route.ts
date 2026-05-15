// ============================================================
// /api/check-answer — Luồng Gemini dùng cho kiểm tra câu trả lời
// ============================================================
// Tính năng: Chấm nhanh câu hỏi đọc hiểu của học sinh
// Luồng: Gemini SDK → model.generateContent(prompt)
// Parse: result.response.text() → JSON.parse
// Tương thích Frontend: route name + response format giữ nguyên
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

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

    // --- Kiểm tra API key Gemini ---
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API key không tồn tại' }, { status: 500 });
    }

    // --- Khởi tạo Gemini ---
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // --- Tạo prompt ---
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

    // --- Gọi Gemini API tạo văn bản ---
    const result = await model.generateContent(prompt);
    let responseText = result.response.text().trim();

    // Loại bỏ markdown code block nếu có
    responseText = responseText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

    // --- Parse JSON từ response Gemini ---
    let checkResult: { isCorrect: boolean; feedback: string };
    try {
      checkResult = JSON.parse(responseText);
    } catch {
      checkResult = { isCorrect: false, feedback: 'Không thể đánh giá tự động, hãy xem lại câu trả lời.' };
    }

    // --- Trả về cho Frontend (giữ nguyên format) ---
    return NextResponse.json({ success: true, ...checkResult });
  } catch (error) {
    // --- Xử lý lỗi: log + trả response lỗi, không crash server ---
    console.error('Check answer error:', error);
    return NextResponse.json({ error: 'Lỗi kiểm tra câu trả lời' }, { status: 500 });
  }
}
