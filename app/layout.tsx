import type { Metadata } from "next";
import { Press_Start_2P, DM_Sans } from "next/font/google";
import "./globals.css";

// Pixel art heading font — used via --font-cinzel CSS variable
const pressStart = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-cinzel",
  display: "swap",
});

// Clean readable body font — used via --font-crimson CSS variable
const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-crimson",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Idle Realms",
  description: "A browser-based idle RPG — gather, craft, fight, explore.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${pressStart.variable} ${dmSans.variable}`}>
      <body className="min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
