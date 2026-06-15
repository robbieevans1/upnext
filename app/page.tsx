import Link from "next/link";
import Image from "next/image";

export default function LandingPage() {
	return (
		<main className="min-h-screen bg-slate-950 text-white">
			<section className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8">
				{/* Navbar */}
				<nav className="flex items-center justify-between">
					{/* Logo image space */}
					<div className="flex h-14 w-44 items-center justify-center rounded-xl">
						<Image
							src="/UpNext_Logo.png"
							alt="UpNext logo"
							width={300}
							height={120}
							priority
						/>
					</div>

					<div className="flex items-center gap-3">
						<Link
							href="/login"
							className="rounded-lg px-4 py-2 text-sm font-medium text-slate-300 transition hover:text-white"
						>
							Log in
						</Link>

						<Link
							href="/today"
							className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
						>
							Sign up
						</Link>
					</div>
				</nav>

				{/* Hero */}
				<div className="grid flex-1 items-center gap-12 py-16 md:grid-cols-2">
					<div>
						<p className="mb-4 inline-flex rounded-full border border-slate-800 bg-slate-900 px-4 py-2 text-sm text-slate-300">
							Priority-stack task management
						</p>

						<h1 className="max-w-2xl text-5xl font-bold tracking-tight md:text-6xl">
							Stop deciding. Start doing what&apos;s UpNext.
						</h1>

						<p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
							UpNext helps you organize tasks into focused stacks, complete the
							most important work first, and keep momentum across your daily
							improvement goals.
						</p>

						<div className="mt-8 flex flex-col gap-4 sm:flex-row">
							<Link
								href="/today"
								className="rounded-xl bg-white px-6 py-3 text-center font-semibold text-slate-950 transition hover:bg-slate-200"
							>
								Get started
							</Link>

							<Link
								href="/login"
								className="rounded-xl border border-slate-700 px-6 py-3 text-center font-semibold text-white transition hover:bg-slate-900"
							>
								Log in
							</Link>
						</div>
					</div>

					{/* Preview Card */}
					<div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl">
						<div className="mb-6 flex items-center justify-between">
							<div>
								<p className="text-sm text-slate-400">Today&apos;s Stack</p>
								<h2 className="mt-1 text-2xl font-bold">Your next actions</h2>
							</div>

							<span className="rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-300">
								Live
							</span>
						</div>

						<div className="space-y-4">
							<TaskCard title="Exercise" label="Mandatory" />
							<TaskCard title="Work on portfolio" label="Up next" />
							<TaskCard title="Practice one LeetCode problem" label="Later" />
						</div>

						<div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950 p-4">
							<p className="text-sm text-slate-400">Completed today</p>
							<p className="mt-2 text-3xl font-bold">2 tasks</p>
						</div>
					</div>
				</div>
			</section>
		</main>
	);
}

function TaskCard({ title, label }: { title: string; label: string }) {
	return (
		<div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
			<div className="flex items-center justify-between gap-4">
				<p className="font-medium">{title}</p>
				<span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
					{label}
				</span>
			</div>
		</div>
	);
}
