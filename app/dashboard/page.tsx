import AppNav from "@/components/AppNav";
import {
	buildDashboardAnalytics,
	formatHours,
} from "@/app/dashboard/dashboard-utils";
import { addAppDays, formatAppDate, getAppTodayDate } from "@/lib/app-date";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { connection } from "next/server";

const DASHBOARD_DAYS = 14;

export default async function DashboardPage() {
	await connection();

	const session = await getServerSession(authOptions);

	if (!session?.user?.id) {
		redirect("/login");
	}

	const now = new Date();
	const today = getAppTodayDate(now);
	const startDay = addAppDays(today, -(DASHBOARD_DAYS - 1));
	const tomorrow = addAppDays(today, 1);

	const [tasks, taskSessions, downtimeSessions, actionItems, commitments] =
		await Promise.all([
		prisma.task.findMany({
			where: {
				userId: session.user.id,
			},
			include: {
				group: {
					select: {
						name: true,
					},
				},
				completions: {
					where: {
						completedOn: {
							gte: startDay,
							lt: tomorrow,
						},
					},
					select: {
						completedOn: true,
					},
				},
			},
		}),
		prisma.taskSession.findMany({
			where: {
				userId: session.user.id,
				day: {
					gte: startDay,
					lt: tomorrow,
				},
			},
			include: {
				task: {
					select: {
						title: true,
					},
				},
			},
		}),
		prisma.downtimeSession.findMany({
			where: {
				userId: session.user.id,
				day: {
					gte: startDay,
					lt: tomorrow,
				},
			},
		}),
		prisma.actionItem.findMany({
			where: {
				userId: session.user.id,
			},
			select: {
				dueOn: true,
				completedAt: true,
				canceledAt: true,
				playbook: true,
			},
		}),
		prisma.commitment.findMany({
			where: {
				userId: session.user.id,
			},
			select: {
				day: true,
				startsAt: true,
				endsAt: true,
				completedAt: true,
				canceledAt: true,
				playbook: true,
			},
		}),
		]);

	const analytics = buildDashboardAnalytics({
		tasks,
		taskSessions,
		downtimeSessions,
		actionItems,
		commitments,
		today,
		now,
		days: DASHBOARD_DAYS,
	});
	const maxCompletions = Math.max(
		1,
		...analytics.dayBuckets.map((bucket) => bucket.completions),
	);
	const maxDowntimeSeconds = Math.max(
		1,
		...analytics.dayBuckets.map((bucket) => bucket.downtimeSeconds),
	);
	const maxGroupCompletions = Math.max(
		1,
		...analytics.groupCompletionTotals.map((group) => group.count),
	);
	const maxCategorySeconds = Math.max(
		1,
		...analytics.downtimeCategoryTotals.map((category) => category.totalSeconds),
	);

	return (
		<>
			<AppNav />

			<main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
				<section className="mx-auto max-w-5xl">
					<p className="mb-2 text-sm font-medium text-sky-400">Analytics</p>

					<h1 className="text-4xl font-bold tracking-tight">Dashboard</h1>

					<p className="mt-3 max-w-2xl text-slate-400">
						Review the last {DASHBOARD_DAYS} app days of task completion, time
						away from improvement work, scheduled load, action items, and
						playbook coverage.
					</p>

					<div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
						<MetricTile
							label="Task Completion Rate"
							value={`${analytics.completionRate}%`}
							detail={`${analytics.totalCompletions} completions across ${analytics.activeTaskCount} active tasks`}
						/>
						<MetricTile
							label="Task Time"
							value={formatHours(analytics.totalTaskSeconds)}
							detail="Focused time captured from task timers"
						/>
						<MetricTile
							label="Downtime Logged"
							value={formatHours(analytics.totalDowntimeSeconds)}
							detail="Sleep, social, eating, and other life time"
						/>
						<MetricTile
							label="Playbook Coverage"
							value={`${analytics.playbookSummary.coverage}%`}
							detail={`${analytics.playbookSummary.withPlaybook} of ${analytics.playbookSummary.total} items have notes`}
						/>
					</div>

					<div className="mt-8 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
						<Panel title="Daily Completions">
							<div className="flex h-56 items-end gap-2">
								{analytics.dayBuckets.map((bucket) => (
									<div
										key={bucket.dayKey}
										className="flex min-w-0 flex-1 flex-col items-center gap-2"
									>
										<div className="flex h-40 w-full items-end rounded-lg bg-slate-950 px-1">
											<div
												className="w-full rounded-md bg-sky-500"
												style={{
													height: `${Math.max(6, (bucket.completions / maxCompletions) * 100)}%`,
												}}
											/>
										</div>
										<p className="text-xs font-medium text-slate-300">
											{bucket.completions}
										</p>
										<p className="truncate text-[11px] text-slate-500">
											{bucket.label}
										</p>
									</div>
								))}
							</div>
						</Panel>

						<Panel title="Action Items">
							<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
								<SmallStat
									label="Open"
									value={analytics.actionItemSummary.open}
								/>
								<SmallStat
									label="Overdue"
									value={analytics.actionItemSummary.overdue}
									accent="text-red-300"
								/>
								<SmallStat
									label="Completed"
									value={analytics.actionItemSummary.completed}
									accent="text-emerald-300"
								/>
								<SmallStat
									label="Canceled"
									value={analytics.actionItemSummary.canceled}
									accent="text-slate-300"
								/>
							</div>
						</Panel>
					</div>

					<div className="mt-6 grid gap-6 lg:grid-cols-2">
						<Panel title="Completion By Area">
							{analytics.groupCompletionTotals.length > 0 ? (
								<div className="space-y-4">
									{analytics.groupCompletionTotals.map((group) => (
										<HorizontalBar
											key={group.name}
											label={group.name}
											value={`${group.count}`}
											percent={(group.count / maxGroupCompletions) * 100}
											colorClass="bg-violet-400"
										/>
									))}
								</div>
							) : (
								<EmptyState>No group completions in this window.</EmptyState>
							)}
						</Panel>

						<Panel title="Downtime By Category">
							<div className="space-y-4">
								{analytics.downtimeCategoryTotals.map((category) => (
									<HorizontalBar
										key={category.category}
										label={category.category}
										value={formatHours(category.totalSeconds)}
										percent={
											(category.totalSeconds / maxCategorySeconds) * 100
										}
										colorClass="bg-emerald-400"
									/>
								))}
							</div>
						</Panel>
					</div>

					<div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
						<Panel title="Task Time By Task">
							{analytics.taskTimeTotals.length > 0 ? (
								<div className="space-y-3">
									{analytics.taskTimeTotals.slice(0, 8).map((task) => (
										<HorizontalBar
											key={task.title}
											label={task.title}
											value={formatHours(task.totalSeconds)}
											percent={
												analytics.totalTaskSeconds === 0
													? 0
													: (task.totalSeconds / analytics.totalTaskSeconds) *
														100
											}
											colorClass="bg-sky-400"
										/>
									))}
								</div>
							) : (
								<EmptyState>Start task timers to track task time.</EmptyState>
							)}
						</Panel>

						<Panel title="Daily Downtime">
							<div className="space-y-3">
								{analytics.dayBuckets.map((bucket) => (
									<HorizontalBar
										key={bucket.dayKey}
										label={bucket.label}
										value={formatHours(bucket.downtimeSeconds)}
										percent={
											(bucket.downtimeSeconds / maxDowntimeSeconds) * 100
										}
										colorClass="bg-cyan-400"
									/>
								))}
							</div>
						</Panel>

						<Panel title="Scheduled Load" className="lg:col-start-2">
							<div className="space-y-4">
								<SmallStat
									label="Upcoming"
									value={analytics.commitmentSummary.upcoming}
								/>
								<SmallStat
									label="Completed"
									value={analytics.commitmentSummary.completed}
									accent="text-emerald-300"
								/>
								<SmallStat
									label="Canceled"
									value={analytics.commitmentSummary.canceled}
									accent="text-red-300"
								/>
								<div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
									<p className="text-sm text-slate-400">Window</p>
									<p className="mt-1 font-semibold text-slate-100">
										{formatAppDate(startDay)} to {formatAppDate(today)}
									</p>
								</div>
							</div>
						</Panel>
					</div>

					<Panel title="Most Completed Tasks" className="mt-6">
						{analytics.taskCompletionTotals.length > 0 ? (
							<div className="grid gap-3 md:grid-cols-2">
								{analytics.taskCompletionTotals.slice(0, 8).map((task) => (
									<div
										key={task.title}
										className="rounded-xl border border-slate-800 bg-slate-950 p-4"
									>
										<div className="flex items-start justify-between gap-3">
											<div>
												<h3 className="font-semibold text-slate-100">
													{task.title}
												</h3>
												<p className="mt-1 text-sm text-slate-500">
													Last completed{" "}
													{task.lastCompletedOn
														? formatAppDate(task.lastCompletedOn)
														: "never"}
												</p>
											</div>
											<span className="rounded-full bg-sky-500/10 px-3 py-1 text-sm font-semibold text-sky-300">
												{task.count}
											</span>
										</div>
									</div>
								))}
							</div>
						) : (
							<EmptyState>Complete tasks to populate this list.</EmptyState>
						)}
					</Panel>
				</section>
			</main>
		</>
	);
}

function MetricTile({
	label,
	value,
	detail,
}: {
	label: string;
	value: string;
	detail: string;
}) {
	return (
		<div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
			<p className="text-sm font-medium text-slate-400">{label}</p>
			<p className="mt-3 text-3xl font-bold text-slate-50">{value}</p>
			<p className="mt-2 text-sm text-slate-500">{detail}</p>
		</div>
	);
}

function Panel({
	title,
	children,
	className = "",
}: {
	title: string;
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<section
			className={`rounded-xl border border-slate-800 bg-slate-900 p-5 ${className}`}
		>
			<h2 className="mb-5 text-lg font-semibold text-slate-100">{title}</h2>
			{children}
		</section>
	);
}

function SmallStat({
	label,
	value,
	accent = "text-sky-300",
}: {
	label: string;
	value: number;
	accent?: string;
}) {
	return (
		<div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
			<p className="text-sm text-slate-400">{label}</p>
			<p className={`mt-2 text-2xl font-bold ${accent}`}>{value}</p>
		</div>
	);
}

function HorizontalBar({
	label,
	value,
	percent,
	colorClass,
}: {
	label: string;
	value: string;
	percent: number;
	colorClass: string;
}) {
	return (
		<div>
			<div className="mb-2 flex items-center justify-between gap-3 text-sm">
				<span className="truncate font-medium text-slate-300">{label}</span>
				<span className="shrink-0 text-slate-500">{value}</span>
			</div>
			<div className="h-3 overflow-hidden rounded-full bg-slate-950">
				<div
					className={`h-full rounded-full ${colorClass}`}
					style={{ width: `${Math.max(4, Math.min(100, percent))}%` }}
				/>
			</div>
		</div>
	);
}

function EmptyState({ children }: { children: React.ReactNode }) {
	return (
		<div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-400">
			{children}
		</div>
	);
}
