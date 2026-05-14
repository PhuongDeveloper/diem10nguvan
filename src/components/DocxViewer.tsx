'use client';

import { useEffect, useState } from 'react';
import mammoth from 'mammoth';
import { motion } from 'framer-motion';

interface DocxViewerProps {
  filePath: string; // path relative to public/
}

export default function DocxViewer({ filePath }: DocxViewerProps) {
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadDocx();
  }, [filePath]);

  const loadDocx = async () => {
    setLoading(true);
    setError('');
    try {
      // Fetch the docx file from public directory
      const response = await fetch(filePath);
      if (!response.ok) {
        throw new Error(`Không tìm thấy file đề thi (${response.status})`);
      }
      const arrayBuffer = await response.arrayBuffer();

      // Convert docx to HTML using mammoth
      const result = await mammoth.convertToHtml({ arrayBuffer });
      setHtmlContent(result.value);

      if (result.messages.length > 0) {
        console.warn('Mammoth warnings:', result.messages);
      }
    } catch (err) {
      console.error('Error loading docx:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Không thể tải file đề thi. Vui lòng kiểm tra lại.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full mb-4"
        />
        <p className="text-text-secondary text-sm">Đang tải đề thi...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 px-6 text-center">
        <svg className="w-12 h-12 mb-3 text-accent-red" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <p className="text-accent-red font-semibold mb-1">Lỗi tải đề</p>
        <p className="text-text-secondary text-sm">{error}</p>
        <button
          onClick={loadDocx}
          className="mt-4 px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary-dark transition-colors"
        >
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="docx-content max-h-full overflow-y-auto"
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
}
