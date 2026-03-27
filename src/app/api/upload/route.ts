import { NextRequest, NextResponse } from 'next/server';

/**
 * API Route: Upload image to upanhnhanh.com
 * Proxies the upload to keep the API key secure server-side
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const image = formData.get('image') as File;

    if (!image) {
      return NextResponse.json(
        { error: 'Không tìm thấy file ảnh' },
        { status: 400 }
      );
    }

    // Forward to upanhnhanh API
    const uploadFormData = new FormData();
    uploadFormData.append('images[]', image);

    const apiKey = process.env.UPANHNHANH_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key chưa được cấu hình' },
        { status: 500 }
      );
    }

    const response = await fetch('https://upanhnhanh.com/api/v1/upload', {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
      },
      body: uploadFormData,
    });

    const data = await response.json();

    if (data.success) {
      return NextResponse.json({ success: true, urls: data.urls });
    } else {
      return NextResponse.json(
        { error: 'Upload thất bại', details: data.errors },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Lỗi server khi upload ảnh' },
      { status: 500 }
    );
  }
}
