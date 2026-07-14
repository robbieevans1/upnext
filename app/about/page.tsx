import AppNav from "@/components/AppNav";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import Link from "next/link";

const featureSections = [
	{
		title: "Daily stack, timers, and subtasks",
		body: "UpNext organizes recurring work into a daily stack. Mandatory tasks stay visible, grouped tasks rotate after completion, subtasks can collapse when they get long, task skips handle days when work is not realistic, and task timers record focused work without forcing every subtask to be finished first.",
	},
	{
		title: "Playbooks and reusable notes",
		body: "Tasks, action items, and commitments can include playbook notes for tips, mindset cues, and mistakes to avoid. Topics provide a separate space for reusable long-form notes, general playbooks, current focus areas, and image montages.",
	},
	{
		title: "Planning beyond recurring tasks",
		body: "Action items handle one-off async errands, while commitments cover scheduled events, appointments, and recurring obligations. The calendar brings dated action items, commitments, recurring occurrences, and announcements into a monthly view.",
	},
	{
		title: "Daily review and challenges",
		body: "Daily Review checks capture outcomes that can only be judged after the day ends, such as nutrition, spending, sleep, or streak goals. Yesterday's review reopens each fresh session until unanswered checks are completed.",
	},
	{
		title: "Time, nutrition, and recovery tracking",
		body: "Track time away for sleep, social, eating, and other life needs. Nutrition tools log calories, daily weight, starting-weight progress, and fasting sessions, including backdated fasting starts when the timer was started late.",
	},
	{
		title: "History and analytics",
		body: "History can be reviewed by day or by Sunday-through-Saturday weeks. The dashboard summarizes completions, task time, lifetime task totals, downtime, commitment load, action item status, Daily Review outcomes, and playbook coverage.",
	},
	{
		title: "Tools for loose tracking",
		body: "The Tools area includes a persistent counter, a flexible timer with manual time adjustments and weekly totals, and a Pomodoro timer with adjustable work and break lengths plus an alarm.",
	},
	{
		title: "Flexible app-day handling",
		body: "UpNext uses Eastern-time app days, supports starting tomorrow's stack early with confirmation, and keeps timers and analytics aligned across daily rollover so unusual schedules still make sense.",
	},
];

const capabilityGroups = [
	{
		title: "Plan",
		items: [
			"Recurring task stack",
			"Mandatory and grouped tasks",
			"Subtasks",
			"Action items",
			"Recurring commitments",
			"Monthly calendar",
		],
	},
	{
		title: "Perform",
		items: [
			"Task timers",
			"Completed-task continuation",
			"Editable playbooks",
			"Topics",
			"Topic images",
			"Toast confirmations",
		],
	},
	{
		title: "Reflect",
		items: [
			"Daily Review checks",
			"Challenge streaks",
			"Day and week history",
			"Dashboard charts",
			"Task-time analytics",
			"Soft-delete-aware reporting",
		],
	},
	{
		title: "Track",
		items: [
			"Downtime categories",
			"Calories",
			"Weight baseline",
			"Fasting timer",
			"Flexible timer",
			"Pomodoro and counter",
		],
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
						daily stack, tracks the time spent doing them, and connects the
						rest of the day around that work: commitments, errands, notes,
						health habits, downtime, and review prompts. Instead of showing
						every item as equally important, UpNext helps you focus on the next
						best thing to do and understand what actually happened afterward.
					</p>

					<p className="mt-5 text-lg leading-8 text-slate-300">
						There is only so much time in a single day, and sometimes we are not
						able to finish everything we planned. UpNext is designed for that
						reality. It helps make sure important work, one-off obligations,
						daily outcomes, and reusable execution notes do not get ignored,
						forgotten, or repeatedly pushed aside.
					</p>

					<div className="mt-10 grid gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:grid-cols-2">
						{capabilityGroups.map((group) => (
							<div key={group.title}>
								<h2 className="text-sm font-semibold uppercase tracking-wide text-sky-300">
									{group.title}
								</h2>

								<ul className="mt-3 space-y-2 text-sm text-slate-300">
									{group.items.map((item) => (
										<li key={item}>{item}</li>
									))}
								</ul>
							</div>
						))}
					</div>

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
