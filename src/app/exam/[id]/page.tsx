import { getExamById } from '@/lib/examData';
import { notFound } from 'next/navigation';
import ExamWorkspace from './ExamWorkspace';

interface ExamPageProps {
  params: Promise<{ id: string }>;
}

export default async function ExamPage({ params }: ExamPageProps) {
  const resolvedParams = await params;
  const exam = getExamById(resolvedParams.id);

  if (!exam) {
    notFound();
  }

  return <ExamWorkspace exam={exam} />;
}
