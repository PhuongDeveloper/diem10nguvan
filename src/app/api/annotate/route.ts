import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface Annotation {
  phrase: string;
  suggestion: string;
}

export async function POST(request: NextRequest) {
  try {
    const { currentText } = await request.json();

    // Skip if text is too short
    if (!currentText || currentText.trim().length < 100) {
      return NextResponse.json({ success: true, annotations: [] });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API key không tồn tại' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `Bạn là một giáo viên Ngữ Văn THPT kiểm tra bài viết của học sinh.

BÀI VIẾT CỦA HỌC SINH:
${currentText}

Hãy tìm tối đa 3 vấn đề trong bài thuộc một trong các loại sau:
1. Lỗi chính tả rõ ràng (viết sai từ)
2. Câu sai ngữ pháp hoặc dùng từ sai nghĩa hoàn toàn
3. Câu quá dài (trên 50 từ) mà không có dấu ngắt câu nào (dấu chấm, dấu phẩy, v.v.) — gây khó đọc

QUY TẮC:
- Ưu tiên các lỗi loại 1 và 2 trước. Loại 3 chỉ flag khi câu thực sự rất dài và dày đặc.
- Chỉ chọn từ hoặc đoạn ngắn (dưới 12 từ) CHÍNH XÁC có trong bài để làm "phrase".
- Suggestion ngắn gọn, cụ thể, tiếng Việt.
- Nếu không có vấn đề đáng kể, trả về [].

Trả về JSON thuần túy (không có markdown code block) theo định dạng:
[{"phrase": "từ/đoạn cần chú ý", "suggestion": "gợi ý sửa"}]`;

    const result = await model.generateContent(prompt);
    let responseText = result.response.text().trim();

    responseText = responseText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

    let annotations: Annotation[] = [];
    try {
      annotations = JSON.parse(responseText);
      if (!Array.isArray(annotations)) annotations = [];
    } catch {
      annotations = [];
    }

    return NextResponse.json({ success: true, annotations });
  } catch (error) {
    console.error('Annotate error:', error);
    return NextResponse.json({ error: 'Lỗi phân tích bài viết' }, { status: 500 });
  }
}
