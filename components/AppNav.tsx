"use client";

import { useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";

const navLinks = [
	{
		href: "/today",
		label: "Today",
	},
	{
		href: "/tasks",
		label: "Tasks",
	},
	{
		href: "/downtime",
		label: "Time",
	},
	{
		href: "/history",
		label: "History",
	},
	{
		href: "/about",
		label: "About",
	},
];

export default function AppNav() {
	const [isMenuOpen, setIsMenuOpen] = useState(false);

	function handleSignOut() {
		signOut({
			callbackUrl: "/",
		});
	}

	return (
		<nav className="border-b border-slate-800 bg-slate-950 px-6 py-4 text-white">
			<div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
				<Link href="/today" className="text-lg font-bold text-sky-400">
					UpNext
				</Link>

				<div className="hidden items-center gap-4 text-sm text-slate-300 md:flex">
					{navLinks.map((link) => (
						<Link key={link.href} href={link.href} className="hover:text-sky-400">
							{link.label}
						</Link>
					))}

					<button
						type="button"
						onClick={handleSignOut}
						className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 transition hover:border-red-400 hover:text-red-300"
					>
						Log out
					</button>
				</div>

				<button
					type="button"
					aria-label="Open navigation menu"
					aria-expanded={isMenuOpen}
					aria-controls="mobile-navigation"
					onClick={() => setIsMenuOpen(true)}
					className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 text-slate-200 transition hover:border-sky-500 hover:text-sky-300 md:hidden"
				>
					<span className="flex flex-col gap-1.5" aria-hidden="true">
						<span className="block h-0.5 w-5 rounded-full bg-current" />
						<span className="block h-0.5 w-5 rounded-full bg-current" />
						<span className="block h-0.5 w-5 rounded-full bg-current" />
					</span>
				</button>
			</div>

			{isMenuOpen && (
				<div className="fixed inset-0 z-50 md:hidden">
					<button
						type="button"
						aria-label="Close navigation menu"
						onClick={() => setIsMenuOpen(false)}
						className="absolute inset-0 bg-slate-950/70"
					/>

					<aside
						id="mobile-navigation"
						role="dialog"
						aria-modal="true"
						aria-label="Navigation menu"
						className="absolute right-0 top-0 flex h-full w-72 max-w-[85vw] flex-col border-l border-slate-800 bg-slate-950 p-6 shadow-2xl"
					>
						<div className="flex items-center justify-between gap-4">
							<Link
								href="/today"
								onClick={() => setIsMenuOpen(false)}
								className="text-lg font-bold text-sky-400"
							>
								UpNext
							</Link>

							<button
								type="button"
								aria-label="Close navigation menu"
								onClick={() => setIsMenuOpen(false)}
								className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 text-xl leading-none text-slate-200 transition hover:border-sky-500 hover:text-sky-300"
							>
								<span aria-hidden="true">x</span>
							</button>
						</div>

						<div className="mt-8 flex flex-col gap-2">
							{navLinks.map((link) => (
								<Link
									key={link.href}
									href={link.href}
									onClick={() => setIsMenuOpen(false)}
									className="rounded-lg px-3 py-3 text-base font-medium text-slate-200 transition hover:bg-slate-900 hover:text-sky-300"
								>
									{link.label}
								</Link>
							))}
						</div>

						<button
							type="button"
							onClick={handleSignOut}
							className="mt-auto rounded-lg border border-slate-700 px-4 py-3 text-left text-sm font-medium text-slate-300 transition hover:border-red-400 hover:text-red-300"
						>
							Log out
						</button>
					</aside>
				</div>
			)}
		</nav>
	);
}
