import fs from 'fs';
import path from 'path';

export interface ExamInfo {
  id: string; // e.g., "lop10-1"
  grade: number; // 10, 11, 12
  title: string;
  dethiPath: string; // path relative to public/
  huongdanchamPath: string;
}

// Read the public/dethi folder dynamically
export function scanExams(): ExamInfo[] {
  const exams: ExamInfo[] = [];
  const grades = [6, 7, 8, 9, 10, 11, 12];
  
  // Need to handle paths correctly when running in Next.js
  const publicDir = path.join(process.cwd(), 'public');

  for (const grade of grades) {
    const dirPath = path.join(publicDir, 'dethi', `lop${grade}`);
    
    try {
      if (fs.existsSync(dirPath)) {
        const files = fs.readdirSync(dirPath);
        
        files.forEach((file) => {
          if (file.endsWith('.docx')) {
            // Extract the name without extension (e.g., "1.docx" -> "1")
            const baseName = file.replace('.docx', '');
            exams.push({
              id: `lop${grade}-${baseName}`,
              grade,
              title: `Đề ${baseName}`,
              dethiPath: `/dethi/lop${grade}/${file}`,
              huongdanchamPath: `/huongdancham/lop${grade}/${file}`,
            });
          }
        });
      }
    } catch (e) {
      console.error(`Error reading directory ${dirPath}:`, e);
    }
  }

  // Define sort order: sort alphabetically or numerically by baseName
  exams.sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true }));

  return exams;
}

// Server-side helper to get exam by id
export function getExamById(id: string): ExamInfo | undefined {
  const allExams = scanExams();
  return allExams.find((e) => e.id === id);
}
