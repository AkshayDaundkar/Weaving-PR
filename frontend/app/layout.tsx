import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

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
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var k='posthog-impact-theme';var t=localStorage.getItem(k);var d=document.documentElement;if(t)d.setAttribute('data-theme',t);else if(window.matchMedia('(prefers-color-scheme: dark)').matches)d.setAttribute('data-theme','dark');})();`,
          }}
        />
      </head>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased min-h-screen bg-primary text-primary`}
      >
        {children}
      </body>
    </html>
  );
}
