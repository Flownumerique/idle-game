import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Idle Realms",
  description: "A browser-based idle RPG — gather, craft, fight, explore.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#1a1a2e] text-slate-200 antialiased">
        {children}
      </body>
    </html>
  );
}
