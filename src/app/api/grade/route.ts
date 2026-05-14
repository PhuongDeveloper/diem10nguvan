// ============================================================
// /api/grade — API chấm bài Ngữ Văn (text hoặc ảnh)
// ============================================================
// LUỒNG CŨ (Gemini): model.generateContent() — hỗ trợ multimodal (text + ảnh)
// LUỒNG MỚI (DeepSeek): callDeepSeekAPI() — chỉ hỗ trợ text
//   → Với bài làm dạng text: gọi DeepSeek bình thường
//   → Với bài làm dạng ảnh: trả về lỗi yêu cầu nhập text thay vì ảnh
//     (DeepSeek text-only không hỗ trợ phân tích ảnh)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { callDeepSeekAPI, extractJSON } from '@/lib/deepseek';

const SYSTEM_PROMPT = `Bạn là một giáo viên chấm thi Ngữ Văn THPT cực kỳ khắt khe và công minh. Nhiệm vụ của bạn là chấm bài làm của học sinh dựa trên Hướng dẫn chấm được cung cấp.

QUY TẮC CHẤM:
1. ĐIỂM TỐI ĐA là 9.5/10. Không bao giờ cho 10 điểm trừ khi bài hoàn hảo tuyệt đối.
2. So khớp chặt chẽ với Hướng dẫn chấm. Thiếu ý = trừ điểm tương ứng.
3. Đánh giá cả nội dung lẫn diễn đạt (lỗi chính tả, ngữ pháp, diễn đạt lủng củng).
4. Khen ngợi những điểm tốt, nhưng phải thẳng thắn chỉ ra lỗi.

BẮT BUỘC trả về JSON với cấu trúc sau (KHÔNG kèm markdown code block, chỉ trả JSON thuần):
{
  "tong_diem": <number: tổng điểm, max 9.5>,
  "chi_tiet_diem": [
    {
      "cau": "<string: tên câu, ví dụ 'Câu 1 (2.0 điểm)'>",
      "diem": <number: điểm đạt được>,
      "diem_toi_da": <number: điểm tối đa>,
      "nhan_xet": "<string: nhận xét chi tiết>"
    }
  ],
  "loi_dien_dat": ["<string: mỗi lỗi diễn đạt cụ thể>"],
  "phan_tich_diem_yeu": ["<string: điểm yếu cần cải thiện>"],
  "sticky_note": "<string: lời khuyên cá nhân hoá dựa trên điểm yếu lặp lại>"
}`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      text,
      imageUrl,
      guidanceContent,
      weaknesses,
    } = body;

    if (!text && !imageUrl) {
      return NextResponse.json(
        { error: 'Cần có bài làm (text hoặc ảnh)' },
        { status: 400 }
      );
    }

    // DeepSeek text-only không hỗ trợ phân tích ảnh
    if (!text && imageUrl) {
      return NextResponse.json(
        {
          error: 'Hiện tại chức năng chấm bài từ ảnh đang bảo trì. Vui lòng nhập bài làm bằng text.',
        },
        { status: 400 }
      );
    }

    // Build prompt cho DeepSeek
    let userPrompt = `${SYSTEM_PROMPT}\n\nHƯỚNG DẪN CHẤM:\n${guidanceContent || 'Không có hướng dẫn chấm cụ thể. Hãy chấm theo tiêu chuẩn chung của môn Ngữ Văn THPT.'}\n\n`;

    if (weaknesses && weaknesses.length > 0) {
      userPrompt += `LỊCH SỬ ĐIỂM YẾU CỦA HỌC SINH:\n${weaknesses.join(', ')}\n\n`;
    }

    userPrompt += `BÀI LÀM CỦA HỌC SINH (đánh máy):\n${text}`;

    // [MỚI] Gọi DeepSeek thay vì Gemini
    const responseText = await callDeepSeekAPI(userPrompt);

    // Parse JSON từ response
    const gradeResult = extractJSON(responseText);

    return NextResponse.json({ success: true, result: gradeResult });
  } catch (error) {
    console.error('Grading error:', error);
    return NextResponse.json(
      {
        error: 'Lỗi khi chấm bài',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
