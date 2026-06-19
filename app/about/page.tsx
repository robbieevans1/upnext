import AppNav from "@/components/AppNav";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import Link from "next/link";

const featureSections = [
	{
		title: "Daily stack and task rotation",
		body: "UpNext organizes recurring tasks into a focused daily stack. Mandatory tasks stay prominent, neglected tasks become harder to ignore, and grouped tasks rotate after completion so each area gets attention over time.",
	},
	{
		title: "Task timers with continue tracking",
		body: "Start a timer when you begin a task, complete it when you finish, and continue a completed task later if you decide to spend more time on it. Multiple sessions roll into the same task-time total for analytics.",
	},
	{
		title: "Subtasks without rigid blocking",
		body: "Tasks can include subtasks for step-by-step execution. Subtasks can be checked off and move down the list, but they do not block completion of the parent task when the day calls for flexibility.",
	},
	{
		title: "Playbooks for better execution",
		body: "Tasks, action items, and commitments can include playbook notes: reminders, tips, mindset cues, or common mistakes to avoid before doing the work.",
	},
	{
		title: "Action items and commitments",
		body: "Use action items for one-off async work and commitments for scheduled events, errands, appointments, and time-based obligations that should appear in the daily flow.",
	},
	{
		title: "Time away tracking",
		body: "Track sleep, social time, eating, and other time away from improvement activities. When no task timer is running, Other time can run automatically so the day has a more complete time picture.",
	},
	{
		title: "History by day",
		body: "The history view lets you review what was completed on previous days and move through daily records without relying on memory alone.",
	},
	{
		title: "Analytics dashboard",
		body: "The dashboard summarizes task completions, task time, downtime, scheduled load, action item status, playbook coverage, and other signals that help reveal patterns in how time is actually spent.",
	},
];

export default async function AboutPage() {
	const session = await getServerSession(authOptions);

	return (
		<>
			{session?.user ? <AppNav /> : <PublicAboutNav />}

			<main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
				<section className="mx-auto max-w-3xl">
					<p className="mb-2 text-sm font-medium text-sky-400">About UpNext</p>

					<h1 className="text-4xl font-bold tracking-tight">
						A task app built around what you should do next.
					</h1>

					<p className="mt-5 text-lg leading-8 text-slate-300">
						UpNext is a productivity app that organizes recurring tasks into a
						daily stack, tracks the time spent doing them, and gives you a
						clearer picture of the life time around them. Instead of showing
						every task as equally important, UpNext helps you focus on the next
						best thing to do.
					</p>

					<p className="mt-5 text-lg leading-8 text-slate-300">
						There is only so much time in a single day, and sometimes we are not
						able to finish everything we planned. UpNext is designed for that
						reality. It helps make sure important tasks do not get ignored,
						forgotten, or repeatedly pushed aside.
					</p>

					<div className="mt-10 grid gap-5">
						{featureSections.map((feature) => (
							<div
								key={feature.title}
								className="rounded-2xl border border-slate-800 bg-slate-900 p-6"
							>
								<h2 className="text-xl font-bold">{feature.title}</h2>

								<p className="mt-3 leading-7 text-slate-400">
									{feature.body}
								</p>
							</div>
						))}
					</div>

					<div className="mt-10 rounded-2xl border border-sky-500/30 bg-sky-500/10 p-6">
						<h2 className="text-xl font-bold">The goal</h2>

						<p className="mt-3 leading-7 text-slate-300">
							UpNext is designed to reduce avoidance. It helps users rotate
							through important recurring tasks instead of repeatedly choosing
							only the easiest work. By bringing neglected tasks back to the top
							of the stack, UpNext nudges users to make steady progress across
							the areas that matter most.
						</p>

						<p className="mt-3 leading-7 text-slate-300">
							The goal is not to attempt to have a perfect day every day. The
							goal is to balance the demands of daily life while making
							consistent progress across a variety of areas.
						</p>

						<div className="mt-6 flex flex-wrap gap-3">
							<Link
								href={session?.user ? "/today" : "/signup"}
								className="rounded-xl bg-sky-500 px-5 py-3 font-semibold text-slate-950 hover:bg-sky-400"
							>
								{session?.user ? "View Today's Stack" : "Get started"}
							</Link>

							<Link
								href={session?.user ? "/tasks" : "/login"}
								className="rounded-xl border border-slate-700 px-5 py-3 font-semibold text-slate-200 hover:border-sky-500 hover:text-sky-400"
							>
								{session?.user ? "Manage Tasks" : "Log in"}
							</Link>
						</div>
					</div>
				</section>
			</main>
		</>
	);
}

function PublicAboutNav() {
	return (
		<nav className="border-b border-slate-800 bg-slate-950 px-6 py-4 text-white">
			<div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
				<Link href="/" className="text-lg font-bold text-sky-400">
					UpNext
				</Link>

				<div className="flex items-center gap-3">
					<Link
						href="/login"
						className="rounded-lg px-4 py-2 text-sm font-medium text-slate-300 transition hover:text-white"
					>
						Log in
					</Link>

					<Link
						href="/signup"
						className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
					>
						Sign up
					</Link>
				</div>
			</div>
		</nav>
	);
}
