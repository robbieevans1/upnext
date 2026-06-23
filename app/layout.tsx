import type { Metadata } from "next";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import MidnightRefresh from "@/components/MidnightRefresh";
import "./globals.css";

export const metadata: Metadata = {
  title: "UpNext",
  description: "",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <MidnightRefresh />
        <AnnouncementBanner />
        {children}
      </body>
    </html>
  );
}
