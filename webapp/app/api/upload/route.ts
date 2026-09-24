import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET is required');

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (e) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ message: 'No file uploaded' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate unique filename
    const ext = path.extname(file.name);
    const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}${ext}`;
    
    // User-specific directory
    const userFolder = `profiles/${decoded.userId}`;
    const uploadDir = path.join(process.cwd(), 'uploads', userFolder);
    const uploadPath = path.join(uploadDir, filename);

    // Ensure directory exists
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (e: any) {
      if (e.code !== 'EEXIST') {
        console.error(`[API /upload] Failed to create directory ${uploadDir}:`, e);
        throw e; // Rethrow to be caught by the outer catch block
      }
    }

    await writeFile(uploadPath, buffer);
    console.log(`[API /upload] File written to: ${uploadPath}`);
    
    const publicFolder = `/uploads/${userFolder}`;
    const publicUrl = `${publicFolder}/${filename}`;
    console.log(`[API /upload] Returning URL: ${publicUrl}`);

    return NextResponse.json({ 
      url: publicUrl,
      folder: publicFolder
    });
  } catch (error) {
    console.error('Upload Error:', error);
    return NextResponse.json({ message: 'Upload failed' }, { status: 500 });
  }
}
