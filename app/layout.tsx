import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "YouTube Video Bibliographer",
  description:
    "Build a timestamped historical bibliography from a YouTube transcript.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="corporate" className="h-full">
      <body className="min-h-full bg-base-100 text-base-content">
        {children}
      </body>
    </html>
  );
}
