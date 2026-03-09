import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Engineering Impact Dashboard",
  description: "Identify the most impactful engineers by complexity-weighted PR output, review impact, velocity, and quality.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}
