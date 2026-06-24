import type { Metadata } from "next";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import FlashToast from "@/components/FlashToast";
import MidnightRefresh from "@/components/MidnightRefresh";
import { getFlashNotification } from "@/lib/flash-notifications";
import "./globals.css";

export const metadata: Metadata = {
  title: "UpNext",
  description: "",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const flashNotification = await getFlashNotification();

  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <MidnightRefresh />
        <AnnouncementBanner />
        {children}
        <FlashToast
          key={flashNotification?.id ?? "no-flash-notification"}
          notification={flashNotification}
        />
      </body>
    </html>
  );
}
