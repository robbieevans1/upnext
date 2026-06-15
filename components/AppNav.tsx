"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";

export default function AppNav() {
	return (
		<nav className="border-b border-slate-800 bg-slate-950 px-6 py-4 text-white">
			<div className="mx-auto flex max-w-2xl items-center justify-between">
				<Link href="/today" className="text-lg font-bold text-sky-400">
					UpNext
				</Link>

				<div className="flex items-center gap-4 text-sm text-slate-300">
					<Link href="/today" className="hover:text-sky-400">
						Today
					</Link>

					<Link href="/tasks" className="hover:text-sky-400">
						Tasks
					</Link>

					<Link href="/about" className="hover:text-sky-400">
						About
					</Link>

					<button
						type="button"
						onClick={() =>
							signOut({
								callbackUrl: "/",
							})
						}
						className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 transition hover:border-red-400 hover:text-red-300"
					>
						Log out
					</button>
				</div>
			</div>
		</nav>
	);
}