// ============================================================
// deepseek.ts — Server-side helper gọi API DeepSeek (OpenAI Compatible)
// ============================================================
//
// LUỒNG CŨ (Gemini — ĐÃ LOẠI BỎ):
//   - Dùng @google/generative-ai SDK
//   - model.generateContent(prompt) → result.response.text()
//
// LUỒNG MỚI (DeepSeek — OpenAI Compatible):
//   - Endpoint: http://36.50.135.174:20128/v1/chat/completions
//   - Method: POST
//   - Headers: Content-Type + Authorization Bearer
//   - Payload: { model, messages, stream: false }
//   - Parse: response.choices[0].message.content
//
// ============================================================

// --- CẤU HÌNH CỨNG cho máy chủ AI tự host ---
const DEEPSEEK_API_URL = 'http://36.50.135.174:20128/v1/chat/completions';
const DEEPSEEK_API_KEY = 'sk-1b3e1db5a7217c40-rdqzqx-8cdc26e7';
const DEEPSEEK_MODEL = 'my-deepseek';

/**
 * Gọi API DeepSeek (chuẩn OpenAI Compatible) để tạo văn bản.
 *
 * Thay thế hoàn toàn cho Gemini generateContent.
 * Bao gồm try-catch + AbortController timeout, log lỗi rõ ràng.
 *
 * @param prompt - Nội dung prompt gửi cho AI
 * @param timeoutMs - Thời gian timeout (mặc định 120s)
 * @returns Chuỗi text trả về từ AI
 */
export async function callDeepSeekAPI(
  prompt: string,
  timeoutMs: number = 120_000
): Promise<string> {
  try {
    // AbortController để xử lý timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    console.log('[DeepSeek] Đang gọi API...');

    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: [{ role: 'user', content: prompt }],
        stream: false,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '(không đọc được body)');
      console.error(`[DeepSeek] HTTP ${response.status}: ${errorBody}`);
      throw new Error(`DeepSeek API error: ${response.status} ${response.statusText}`);
    }

    // Parse chuẩn OpenAI: choices[0].message.content
    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || '';

    if (!content) {
      console.warn('[DeepSeek] Content rỗng:', JSON.stringify(data).substring(0, 500));
      throw new Error('DeepSeek API trả về nội dung rỗng');
    }

    console.log('[DeepSeek] Thành công, độ dài:', content.length);
    return content;
  } catch (error: unknown) {
    const err = error as Error & { name?: string };

    if (err.name === 'AbortError') {
      console.error(`[DeepSeek] Timeout sau ${timeoutMs / 1000}s`);
      throw new Error(`DeepSeek API timeout sau ${timeoutMs / 1000} giây`);
    }

    if (err.message?.includes('fetch')) {
      console.error('[DeepSeek] Lỗi mạng:', err.message);
      throw new Error('Không thể kết nối tới máy chủ AI. Vui lòng thử lại sau.');
    }

    console.error('[DeepSeek] Lỗi không xác định:', error);
    throw error;
  }
}

/**
 * Trích xuất JSON từ text trả về bởi AI.
 * Hỗ trợ cả JSON thuần và bọc trong markdown code block.
 */
export function extractJSON(text: string): unknown {
  try {
    return JSON.parse(text.trim());
  } catch {
    // Tìm JSON array [...] hoặc object {...} trong text
    const jsonMatch = text.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
    if (!jsonMatch) {
      console.error('[DeepSeek] Không tìm thấy JSON:', text.substring(0, 300));
      throw new Error('Không tìm thấy JSON hợp lệ trong phản hồi AI');
    }
    return JSON.parse(jsonMatch[1]);
  }
}
