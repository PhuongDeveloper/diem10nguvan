import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * API Route: Generate quiz questions for Minigame
 * Uses Gemini to create Vietnamese Literature trivia questions
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { topic, difficulty, askedQuestions } = body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key chưa được cấu hình' },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

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

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    let quizData;
    try {
      quizData = JSON.parse(responseText);
    } catch {
      const jsonStart = responseText.indexOf('{');
      const jsonEnd = responseText.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        quizData = JSON.parse(responseText.slice(jsonStart, jsonEnd + 1));
      } else {
        throw new Error('Cannot parse quiz data');
      }
    }

    return NextResponse.json({ success: true, quiz: quizData });
  } catch (error) {
    console.error('Quiz generation error:', error);
    return NextResponse.json(
      { error: 'Lỗi tạo câu hỏi', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
