import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: NextRequest) {
  try {
    const { currentText, guidanceContent } = await request.json();

    // Skip API call if text is too short – return fixed prompt
    if (!currentText || currentText.trim().length < 20) {
      return NextResponse.json({
        success: true,
        hint: 'Hãy bắt đầu viết bài của em nhé! Đọc kỹ đề trước khi bắt đầu.',
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API key không tồn tại' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `Bạn là một giáo viên Ngữ Văn THPT đang theo dõi học sinh luyện tập. Hãy đóng vai như một "dàn ý di động" hướng dẫn học sinh viết đúng cấu trúc bài.

HƯỚNG DẪN CHẤM (dàn ý tham khảo):
${guidanceContent || 'Bài thi Ngữ Văn THPT thông thường gồm phần Đọc hiểu (3 điểm) và phần Viết (7 điểm: thường gồm nghị luận văn học và nghị luận xã hội).'}

BÀI VIẾT HIỆN TẠI:
${currentText}

Nhiệm vụ của bạn:
1. Xác định học sinh đang ở PHẦN NÀO của bài thi (Đọc hiểu / Nghị luận xã hội / Nghị luận văn học)
2. So sánh với dàn ý chuẩn, xác định học sinh đang viết phần nào, còn thiếu phần nào
3. Gợi ý ngắn gọn, cụ thể (3-5 dòng) theo format:
   "Em đang ở [tên phần]. [Phần em đã làm tốt]. Tiếp theo, em cần [gợi ý cụ thể về nội dung/ý nào cần bổ sung]. [Nhắc nhở thêm nếu thiếu phần quan trọng]."

Ví dụ tốt: "Em đang ở phần thân bài nghị luận văn học. Mở bài đã đạt yêu cầu. Tiếp theo, em cần phân tích nhân vật cụ thể bằng dẫn chứng từ tác phẩm, sau đó đánh giá nghệ thuật của tác giả. Em chưa có phần kết bài nên cần hoàn thiện."

Chỉ trả về nội dung gợi ý, không có tiêu đề hay markdown. Dùng ngôi "em" và "cô".`;

    const result = await model.generateContent(prompt);
    const hint = result.response.text().trim();

    return NextResponse.json({ success: true, hint });
  } catch (error) {
    console.error('Hint error:', error);
    return NextResponse.json({ error: 'Lỗi tạo gợi ý' }, { status: 500 });
  }
}
