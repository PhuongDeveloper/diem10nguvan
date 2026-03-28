import type { Metadata } from "next";
import { Quicksand } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/AuthContext";
import Navbar from "@/components/Navbar";
import ChallengeNotification from "@/components/ChallengeNotification";

const quicksand = Quicksand({
  subsets: ["latin", "vietnamese"],
  variable: "--font-quicksand",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Ngữ văn số hoá - Luyện thi Ngữ Văn cùng AI",
  description:
    "Nền tảng luyện thi môn Ngữ Văn tích hợp AI. Chấm bài tự động, phân tích điểm yếu, minigame ôn tập hấp dẫn.",
  keywords: ["ngữ văn", "luyện thi", "AI", "chấm bài", "học sinh"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className={`${quicksand.variable} font-sans antialiased`}>
        <AuthProvider>
          {/* Animated background blobs */}
          <div className="blob-bg" />
          <Navbar />
          <ChallengeNotification />
          <main className="min-h-[calc(100vh-72px)]">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
