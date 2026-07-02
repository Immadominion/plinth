import type { Metadata } from "next";
import { Inter, Instrument_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import RiveCursor from "@/components/RiveCursor";
import ScrollSnap from "@/components/ScrollSnap";

// One family for the whole site — geometric, contemporary, 400–700 + italic.
const sans = Instrument_Sans({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-sans",
  display: "swap",
});
// Kept only as a fallback in the font stack while Instrument Sans loads.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
// JetBrains Mono — code snippets only (Developers section).
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: "Plinth — The base your billing stands on.",
  description:
    "Recurring-payments infrastructure for Nigeria. Subscriptions, recurring billing, and automatic reconciliation — built for how Nigeria actually pays. Powered by Nomba.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${inter.variable} ${mono.variable}`}
    >
      <body className="font-sans bg-bone text-ink antialiased">
        {children}
        <ScrollSnap />
        <RiveCursor />
      </body>
    </html>
  );
}
