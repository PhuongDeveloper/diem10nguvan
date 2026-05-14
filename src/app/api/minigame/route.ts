// ============================================================
// /api/minigame — API tạo dữ liệu minigame (flashcard, match, quiz)
// ============================================================
// LUỒNG CŨ (Gemini — ĐÃ LOẠI BỎ):
//   - Dùng @google/generative-ai SDK → model.generateContent(prompt)
//   - Parse: result.response.text()
//
// LUỒNG MỚI (DeepSeek — OpenAI Compatible):
//   - Gọi callDeepSeekAPI() từ @/lib/deepseek
//   - Parse: choices[0].message.content (đã xử lý bên trong helper)
//   - Bảo vệ: try-catch + timeout + log lỗi rõ ràng
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { callDeepSeekAPI, extractJSON } from '@/lib/deepseek';

export async function POST(request: NextRequest) {
  try {
    const { type } = await request.json(); // 'flashcard', 'match', 'quiz'

    let prompt = '';
    if (type === 'flashcard') {
      prompt = `Tạo 20 flashcard ngẫu nhiên về lý luận văn học, kỹ năng đọc hiểu, và phương pháp làm bài phân tích Ngữ Văn THPT (chương trình mới 2018). Ví dụ: thao tác lập luận, phương thức biểu đạt, các bước phân tích nhân vật, đặc trưng thể loại thơ, cấu tứ, v.v...
BẮT BUỘC trả về JSON mảng thuần túy:
[{"term": "Tên khái niệm/kỹ năng", "definition": "Định nghĩa/Giải thích ngắn gọn 1-2 câu"}]`;
    } else if (type === 'match') {
      prompt = `Tạo 10 cặp Khái niệm Văn học / Biện pháp tu từ - và Định nghĩa / Ví dụ minh họa của chúng (chương trình Ngữ Văn THPT 2018).
Dùng để chơi game Nối Từ.
BẮT BUỘC trả về JSON mảng thuần túy:
[{"concept": "Tên khái niệm/Biện pháp (vd: Ẩn dụ chuyển đổi cảm giác)", "description": "Định nghĩa hoặc ví dụ minh họa ngắn gọn"}]`;
    } else if (type === 'quiz') {
      prompt = `Tạo 20 câu trắc nghiệm Ngữ Văn THPT ngẫu nhiên tập trung vào kỹ năng đọc hiểu văn bản (ngoài SGK), lý luận văn học, đặc trưng thể loại (thơ, truyện, ký), phương thức biểu đạt, thao tác lập luận (chương trình 2018).
BẮT BUỘC trả về JSON mảng thuần túy:
[{"question": "câu hỏi", "options": ["A", "B", "C", "D"], "correct": <0-3>}]`;
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    // [MỚI] Gọi DeepSeek thay vì Gemini
    const responseText = await callDeepSeekAPI(prompt);
    const data = extractJSON(responseText);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Minigame API error:', error);
    return NextResponse.json(
      {
        error: 'Lỗi tạo dữ liệu minigame',
        details: error instanceof Error ? error.message : 'Unknown',
      },
      { status: 500 }
    );
  }
}
