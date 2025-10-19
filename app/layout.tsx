import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { Analytics } from "@vercel/analytics/react"
import { ClearStorage } from "@/components/clear-storage"
import { NoCache } from "@/components/no-cache"
import { ClearChatCache } from "@/components/clear-chat-cache"
import { DisableAllStorage } from "@/components/disable-all-storage"
import { PreventChatCaching } from "@/components/prevent-chat-caching"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gemini Computer Use Demo",
  description: "A Next.js app that uses Google Gemini 2.5 Flash to create a computer using agent.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <DisableAllStorage />
        <PreventChatCaching />
        <NoCache />
        <ClearStorage />
        <ClearChatCache />
        {children}
        <Toaster />
        <Analytics />
      </body>
    </html>
  );
}
