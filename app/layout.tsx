import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/components/layout/session-provider";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { BackgroundProvider } from "@/components/layout/background-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { I18nProvider } from "@/lib/i18n";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Compass",
  description: "AI 人生教练 — 你的个人成长操作系统",
};

const themeScript = `
  (function() {
    try {
      var t = localStorage.getItem('compass-theme') || 'system';
      var d = document.documentElement;
      d.classList.remove('light', 'dark');
      if (t === 'dark') {
        d.classList.add('dark');
      } else if (t === 'light') {
        d.classList.add('light');
      } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        d.classList.add('dark');
      } else {
        d.classList.add('light');
      }
    } catch(e) {}
  })();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning className="dark">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${inter.className} antialiased`}>
        <SessionProvider>
          <ThemeProvider>
            <BackgroundProvider>
              <I18nProvider>
                <TooltipProvider>
                  {children}
                  <Toaster position="top-center" richColors />
                </TooltipProvider>
              </I18nProvider>
            </BackgroundProvider>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
