import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Volleyball Friends Nalthur | Official Player Registration",
  description:
    "Register for the Volleyball Friends Nalthur village tournament. Complete your player details, role, and photo.",
  keywords: [
    "Volleyball Friends Nalthur",
    "VFN",
    "Volleyball Tournament",
    "Village Tournament",
    "Player Registration",
  ],
  authors: [{ name: "Volleyball Friends Nalthur Committee" }],
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  themeColor: "#070a0e",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased dark`}>
      <body className="min-h-full flex flex-col font-sans bg-[#070a0e] text-slate-100 selection:bg-amber-500 selection:text-slate-950">
        {children}
      </body>
    </html>
  );
}
