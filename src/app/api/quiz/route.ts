// ============================================================
// /api/quiz — API tạo câu hỏi trắc nghiệm cho Minigame
// ============================================================
// LUỒNG CŨ (Gemini): model.generateContent(prompt)
// LUỒNG MỚI (DeepSeek): callDeepSeekAPI(prompt) → extractJSON()
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { callDeepSeekAPI, extractJSON } from '@/lib/deepseek';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { topic, difficulty, askedQuestions } = body;

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

    // [MỚI] Gọi DeepSeek thay vì Gemini
    const responseText = await callDeepSeekAPI(prompt);
    const quizData = extractJSON(responseText);

    return NextResponse.json({ success: true, quiz: quizData });
  } catch (error) {
    console.error('Quiz generation error:', error);
    return NextResponse.json(
      { error: 'Lỗi tạo câu hỏi', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
