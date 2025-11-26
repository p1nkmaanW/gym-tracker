import type { Metadata } from "next";
import "./globals.css"; // <--- THIS LINE IS CRITICAL. IF MISSING, NO STYLES.

export const metadata: Metadata = {
  title: "GymLog",
  description: "Track my workouts",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-gray-50">{children}</body>
    </html>
  );
}