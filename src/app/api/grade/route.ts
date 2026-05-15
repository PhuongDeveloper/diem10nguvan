// ============================================================
// /api/grade — Luồng Gemini: chấm bài Ngữ Văn (text + ảnh)
// ============================================================
// Tính năng: Chấm bài viết tay (ảnh) hoặc đánh máy (text)
// Luồng: Gemini SDK (multimodal) → model.generateContent()
// Parse: result.response.text() → JSON.parse
// Tương thích Frontend: route name + response format giữ nguyên
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const SYSTEM_PROMPT = `Bạn là một giáo viên chấm thi Ngữ Văn THPT cực kỳ khắt khe và công minh. Nhiệm vụ của bạn là chấm bài làm của học sinh dựa trên Hướng dẫn chấm được cung cấp.

QUY TẮC CHẤM:
1. ĐIỂM TỐI ĐA là 9.5/10. Không bao giờ cho 10 điểm trừ khi bài hoàn hảo tuyệt đối.
2. So khớp chặt chẽ với Hướng dẫn chấm. Thiếu ý = trừ điểm tương ứng.
3. Đánh giá cả nội dung lẫn diễn đạt (lỗi chính tả, ngữ pháp, diễn đạt lủng củng).
4. Nếu bài làm là ảnh chụp chữ viết tay: KHÔNG trừ điểm vì lỗi OCR (nhận dạng sai chữ). Chỉ trừ nếu thực sự viết sai.
5. Khen ngợi những điểm tốt, nhưng phải thẳng thắn chỉ ra lỗi.

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
    const { text, imageUrl, guidanceContent, weaknesses } = body;

    if (!text && !imageUrl) {
      return NextResponse.json(
        { error: 'Cần có bài làm (text hoặc ảnh)' },
        { status: 400 }
      );
    }

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

    // --- Build prompt ---
    let userPrompt = `HƯỚNG DẪN CHẤM:\n${guidanceContent || 'Không có hướng dẫn chấm cụ thể. Hãy chấm theo tiêu chuẩn chung của môn Ngữ Văn THPT.'}\n\n`;

    if (weaknesses && weaknesses.length > 0) {
      userPrompt += `LỊCH SỬ ĐIỂM YẾU CỦA HỌC SINH:\n${weaknesses.join(', ')}\n\n`;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parts: any[] = [];

    if (text) {
      // --- Bài làm dạng text (đánh máy) ---
      userPrompt += `BÀI LÀM CỦA HỌC SINH (đánh máy):\n${text}`;
      parts.push({ text: userPrompt });
    } else if (imageUrl) {
      // --- Bài làm dạng ảnh (viết tay) — Gemini multimodal ---
      userPrompt += `BÀI LÀM CỦA HỌC SINH (ảnh chụp bài viết tay - xem hình đính kèm):`;
      parts.push({ text: userPrompt });

      // Fetch ảnh và chuyển sang inline data cho Gemini
      const imageResponse = await fetch(imageUrl);
      const imageBuffer = await imageResponse.arrayBuffer();
      const base64 = Buffer.from(imageBuffer).toString('base64');
      const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg';

      parts.push({
        inlineData: {
          mimeType,
          data: base64,
        },
      });
    }

    // --- Gọi Gemini API (multimodal: text + ảnh) ---
    const result = await model.generateContent({
      systemInstruction: SYSTEM_PROMPT,
      contents: [{ role: 'user', parts }],
    });

    const responseText = result.response.text();

    // --- Parse JSON từ response Gemini ---
    let gradeResult;
    try {
      gradeResult = JSON.parse(responseText);
    } catch {
      // Thử tìm JSON trong markdown code block
      const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        gradeResult = JSON.parse(jsonMatch[1].trim());
      } else {
        const jsonStart = responseText.indexOf('{');
        const jsonEnd = responseText.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1) {
          gradeResult = JSON.parse(responseText.slice(jsonStart, jsonEnd + 1));
        } else {
          throw new Error('Không thể parse kết quả từ AI');
        }
      }
    }

    // --- Trả về cho Frontend (giữ nguyên format) ---
    return NextResponse.json({ success: true, result: gradeResult });
  } catch (error) {
    // --- Xử lý lỗi: log + trả response lỗi, không crash server ---
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
