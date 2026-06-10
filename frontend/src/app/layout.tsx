import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";
import { ToastContainer } from "@/components/ui/toast";
import { AuthProvider } from "@/components/auth/auth-provider";
import { CustomCssInjector } from "@/components/ui/custom-css";

const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: "AI Workspace",
  description: "A premium AI chat and orchestration workspace.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const storage = localStorage.getItem('ai-workspace-storage');
                const theme = storage ? JSON.parse(storage)?.state?.theme : 'dark';
                const root = document.documentElement;
                if (theme === 'system') {
                  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  root.classList.add(systemTheme);
                } else {
                  root.classList.add(theme || 'dark');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} font-[family-name:var(--font-geist-sans)] antialiased bg-background text-foreground flex h-screen overflow-hidden`}>
        <AuthProvider>
          <CustomCssInjector />
          <Sidebar />
          <main className="flex-1 flex flex-col min-w-0">
            {children}
          </main>
        </AuthProvider>
        <ToastContainer />
      </body>
    </html>
  );
}
