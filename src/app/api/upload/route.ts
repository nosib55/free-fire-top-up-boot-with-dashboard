import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'No image file provided' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const imgbbApiKey = process.env.IMGBB_API_KEY?.trim();

    // 1. Try ImgBB if key is configured
    if (imgbbApiKey && imgbbApiKey.length >= 16) {
      try {
        const base64Image = buffer.toString('base64');
        const uploadBody = new URLSearchParams();
        uploadBody.append('key', imgbbApiKey);
        uploadBody.append('image', base64Image);

        const imgbbResponse = await fetch('https://api.imgbb.com/1/upload', {
          method: 'POST',
          body: uploadBody,
        });

        const data = await imgbbResponse.json();

        if (data.success && data.data?.url) {
          return NextResponse.json({
            success: true,
            message: 'Image uploaded successfully to ImgBB cloud',
            url: data.data.url,
            provider: 'ImgBB Cloud',
          });
        }
      } catch (imgbbError) {
        console.warn('ImgBB Cloud Upload encountered an error, using local storage fallback:', imgbbError);
      }
    }

    // 2. High-Performance Local Storage Fallback (Zero-Error Guarantee)
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    await fs.mkdir(uploadsDir, { recursive: true });

    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `logo_${Date.now()}_${safeName}`;
    const filePath = path.join(uploadsDir, filename);

    await fs.writeFile(filePath, buffer);
    const localUrl = `/uploads/${filename}`;

    return NextResponse.json({
      success: true,
      message: 'Image uploaded successfully to server storage',
      url: localUrl,
      provider: 'Local Storage',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Server error during upload' },
      { status: 500 }
    );
  }
}
