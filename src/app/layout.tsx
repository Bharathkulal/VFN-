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
  themeColor: "#0a2e1b",
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
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans bg-[#f6f9f6] text-neutral-900 selection:bg-emerald-800 selection:text-white">
        {children}
      </body>
    </html>
  );
}
