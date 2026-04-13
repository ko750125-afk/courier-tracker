import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import ErrorWatcher from "@/components/ErrorWatcher";
import OnboardingGuide from "@/components/OnboardingGuide";
import FunctionalGuide from "@/components/FunctionalGuide";
import { AuthProvider } from "@/lib/contexts/AuthContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "택배 정산 | 배송 실적 관리",
  description: "택배기사 배송 실적 기록 및 매출 자동 계산 앱",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "택배정산",
  },
  icons: {
    icon: "/icon-v3.png",
    apple: "/apple-touch-icon-v3.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${inter.className} bg-slate-950 text-slate-100 min-h-screen antialiased selection:bg-blue-500/30`}
      >
        <AuthProvider>
          <div className="fixed inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 pointer-events-none" />
          <script
            dangerouslySetInnerHTML={{
              __html: `
                if ('serviceWorker' in navigator) {
                  window.addEventListener('load', function() {
                    navigator.serviceWorker.register('/sw.js');
                  });
                }
              `,
            }}
          />
          <ErrorWatcher />
          <OnboardingGuide />
          <FunctionalGuide />
          <main className="relative max-w-lg mx-auto px-4 pt-8 pb-28 focus:outline-none">{children}</main>
          <BottomNav />
        </AuthProvider>
      </body>
    </html>
  );
}

