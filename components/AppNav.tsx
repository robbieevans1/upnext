"use client";

import { useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";

const navLinks = [
	{
		href: "/today",
		label: "Today",
	},
];

const navGroups = [
	{
		label: "Plan",
		links: [
			{
				href: "/tasks",
				label: "Tasks",
			},
			{
				href: "/action-items",
				label: "Actions",
			},
			{
				href: "/commitments",
				label: "Schedule",
			},
			{
				href: "/topics",
				label: "Topics",
			},
		],
	},
	{
		label: "Track",
		links: [
			{
				href: "/dashboard",
				label: "Dashboard",
			},
			{
				href: "/downtime",
				label: "Time",
			},
			{
				href: "/history",
				label: "History",
			},
		],
	},
	{
		label: "Tools",
		links: [
			{
				href: "/tools/counter",
				label: "Counter",
			},
		],
	},
];

const utilityLinks = [
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
		<nav className="border-b border-slate-800 bg-slate-950 px-4 py-4 text-white sm:px-6">
			<div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3">
				<Link
					href="/today"
					className="min-w-0 truncate text-lg font-bold text-sky-400"
				>
					UpNext
				</Link>

				<div className="hidden items-center gap-3 text-sm text-slate-300 lg:flex">
					{navLinks.map((link) => (
						<Link key={link.href} href={link.href} className="hover:text-sky-400">
							{link.label}
						</Link>
					))}

					{navGroups.map((group) => (
						<div key={group.label} className="group relative">
							<button
								type="button"
								className="rounded-lg px-2 py-1.5 transition hover:bg-slate-900 hover:text-sky-400"
							>
								{group.label}
							</button>

							<div className="invisible absolute left-0 top-full z-40 w-44 pt-2 opacity-0 transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
								<div className="rounded-xl border border-slate-800 bg-slate-950 p-2 shadow-2xl">
									{group.links.map((link) => (
										<Link
											key={link.href}
											href={link.href}
											className="block rounded-lg px-3 py-2 text-slate-200 transition hover:bg-slate-900 hover:text-sky-300"
										>
											{link.label}
										</Link>
									))}
								</div>
							</div>
						</div>
					))}

					{utilityLinks.map((link) => (
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
					className="ml-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-700 text-slate-200 transition hover:border-sky-500 hover:text-sky-300 lg:hidden"
				>
					<span className="flex flex-col gap-1.5" aria-hidden="true">
						<span className="block h-0.5 w-5 rounded-full bg-current" />
						<span className="block h-0.5 w-5 rounded-full bg-current" />
						<span className="block h-0.5 w-5 rounded-full bg-current" />
					</span>
				</button>
			</div>

			{isMenuOpen && (
				<div className="fixed inset-0 z-50 lg:hidden">
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

						<div className="mt-8 flex flex-col gap-5">
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

							{navGroups.map((group) => (
								<div key={group.label}>
									<p className="px-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
										{group.label}
									</p>
									<div className="mt-2 flex flex-col gap-1">
										{group.links.map((link) => (
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
								</div>
							))}

							<div>
								<p className="px-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
									Info
								</p>
								<div className="mt-2 flex flex-col gap-1">
									{utilityLinks.map((link) => (
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
							</div>
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
