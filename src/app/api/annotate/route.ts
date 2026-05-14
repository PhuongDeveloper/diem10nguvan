// ============================================================
// /api/annotate — API phân tích lỗi diễn đạt trong bài viết
// ============================================================
// LUỒNG CŨ (Gemini): model.generateContent(prompt)
// LUỒNG MỚI (DeepSeek): callDeepSeekAPI(prompt) → extractJSON()
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { callDeepSeekAPI, extractJSON } from '@/lib/deepseek';

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

    // [MỚI] Gọi DeepSeek thay vì Gemini
    const responseText = await callDeepSeekAPI(prompt);

    let annotations: Annotation[] = [];
    try {
      const parsed = extractJSON(responseText);
      annotations = Array.isArray(parsed) ? parsed as Annotation[] : [];
    } catch {
      annotations = [];
    }

    return NextResponse.json({ success: true, annotations });
  } catch (error) {
    console.error('Annotate error:', error);
    return NextResponse.json(
      { error: 'Lỗi phân tích bài viết', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
