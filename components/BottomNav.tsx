"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function BottomNav() {
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path ? "text-blue-600" : "text-gray-400";

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around p-4 pb-6 z-50">
      <Link href="/" className={`flex flex-col items-center ${isActive("/")}`}>
        <span className="text-2xl">💪</span>
        <span className="text-xs font-bold">Log</span>
      </Link>
      <Link href="/history" className={`flex flex-col items-center ${isActive("/history")}`}>
        <span className="text-2xl">📅</span>
        <span className="text-xs font-bold">History</span>
      </Link>
    </nav>
  );
}