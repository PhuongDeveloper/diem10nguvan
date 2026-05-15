// ============================================================
// /api/quiz — Luồng Gemini dùng cho tạo câu hỏi trắc nghiệm
// ============================================================
// Tính năng: Tạo 1 câu hỏi trắc nghiệm Ngữ Văn cho Speed Quiz
// Luồng: Gemini SDK → model.generateContent(prompt)
// Parse: result.response.text() → JSON.parse
// Tương thích Frontend: route name + response format giữ nguyên
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { topic, difficulty, askedQuestions } = body;

    // --- Kiểm tra API key Gemini ---
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key chưa được cấu hình' },
        { status: 500 }
      );
    }

    // --- Khởi tạo Gemini ---
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // --- Tạo prompt ---
    let avoidPrompt = '';
    if (askedQuestions && askedQuestions.length > 0) {
      avoidPrompt = `\nHÃY TUYỆT ĐỐI TRÁNH NỘI DUNG CỦA CÁC CÂU HỎI SAU:\n${askedQuestions.map((q: string) => `- ${q}`).join('\n')}`;
    }

    const prompt = `Tạo 1 câu hỏi trắc nghiệm Ngữ Văn THPT${topic ? ` về chủ đề: ${topic}` : ''}.
Độ khó: ${difficulty || 'trung bình'}.${avoidPrompt}

Yêu cầu:
- Câu hỏi ngắn gọn, rõ ràng
- 4 đáp án (A, B, C, D), chỉ 1 đáp án đúng
- Giải thích ngắn gọn tại sao đáp án đúng

BẮT BUỘC trả về JSON (KHÔNG markdown):
{
  "question": "<câu hỏi>",
  "options": ["<A>", "<B>", "<C>", "<D>"],
  "correctIndex": <0-3>,
  "explanation": "<giải thích>"
}`;

    // --- Gọi Gemini API tạo văn bản ---
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // --- Parse JSON từ response Gemini ---
    let quizData;
    try {
      quizData = JSON.parse(responseText);
    } catch {
      // Nếu parse trực tiếp thất bại, tìm JSON object trong text
      const jsonStart = responseText.indexOf('{');
      const jsonEnd = responseText.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        quizData = JSON.parse(responseText.slice(jsonStart, jsonEnd + 1));
      } else {
        throw new Error('Cannot parse quiz data');
      }
    }

    // --- Trả về cho Frontend (giữ nguyên format) ---
    return NextResponse.json({ success: true, quiz: quizData });
  } catch (error) {
    // --- Xử lý lỗi: log + trả response lỗi, không crash server ---
    console.error('Quiz generation error:', error);
    return NextResponse.json(
      { error: 'Lỗi tạo câu hỏi', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
