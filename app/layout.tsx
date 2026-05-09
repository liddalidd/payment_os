import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { DesktopSidebar } from "@/components/desktop-sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { ServiceWorkerRegister } from "@/components/sw-register";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "店铺收银管理",
  description: "本地收银与库存管理系统",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "收银",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ServiceWorkerRegister />
        <div className="flex min-h-screen">
          {/* Desktop Sidebar - Hidden on mobile */}
          <DesktopSidebar />

          {/* Main Content Area */}
          <main className="flex-1 pb-20 md:pb-0 overflow-y-auto h-screen">
            {children}
          </main>

          {/* Mobile Bottom Nav - Hidden on desktop */}
          <MobileNav />
        </div>
      </body>
    </html>
  );
}
