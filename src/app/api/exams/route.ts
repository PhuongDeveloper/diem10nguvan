import { NextResponse } from 'next/server';
import { scanExams } from '@/lib/examData';

export async function GET() {
  try {
    const exams = scanExams();
    return NextResponse.json({ success: true, exams });
  } catch (error) {
    console.error('API /exams error:', error);
    return NextResponse.json({ error: 'Failed to scan exams' }, { status: 500 });
  }
}
