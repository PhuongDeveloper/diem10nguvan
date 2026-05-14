import { GoogleGenerativeAI } from '@google/generative-ai';

async function test() {
  const apiKey = 'AIzaSyCn0z__AW1XcGLd7cVCYadESNPsyw5iRF4';
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

  const prompt = `Tạo 1 câu hỏi trắc nghiệm Ngữ Văn THPT.
Độ khó: trung bình.

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

  try {
    const result = await model.generateContent(prompt);
    console.log(result.response.text());
  } catch (e) {
    console.error('Error:', e);
  }
}

test();
