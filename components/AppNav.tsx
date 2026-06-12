"use client";

import Link from "next/link";

export default function AppNav() {
  return (
    <nav className="border-b border-slate-800 bg-slate-950 px-6 py-4 text-white">
      <div className="mx-auto flex max-w-2xl items-center justify-between">
        <Link href="/" className="text-lg font-bold text-sky-400">
          UpNext
        </Link>

        <div className="flex gap-4 text-sm text-slate-300">
          <Link href="/" className="hover:text-sky-400">
            Today
          </Link>

          <Link href="/tasks" className="hover:text-sky-400">
            Tasks
          </Link>
        </div>
      </div>
    </nav>
  );
}