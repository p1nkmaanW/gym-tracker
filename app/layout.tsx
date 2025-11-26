import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GymLog",
  description: "Track my workouts",
  manifest: "/manifest.json",
  icons: { apple: "/icon.png" }, // Points to your icon for iOS
  appleWebApp: {
    capable: true, // <--- THIS REMOVES THE SAFARI BAR
    statusBarStyle: "black-translucent",
    title: "GymLog",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // <--- PREVENTS ZOOMING ON INPUTS
  userScalable: false, // <--- PREVENTS ZOOMING
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-gray-50 overscroll-none">
        {children}
      </body>
    </html>
  );
}