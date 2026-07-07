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

function formatShortDateLabel(label: string) {
	return label.replace(/\/20(\d{2})$/, "/$1");
}

function getStackedDateLabel(label: string) {
	const [month, day, year] = label.split("/");

	return {
		monthDay: month && day ? `${month}/${day}` : label,
		year: year ?? "",
	};
}

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

	const [
		tasks,
		taskSessions,
		lifetimeTaskSessions,
		downtimeSessions,
		actionItems,
		commitments,
		dailyCheckResults,
	] =
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
		prisma.taskSession.findMany({
			where: {
				userId: session.user.id,
				task: {
					isActive: true,
				},
			},
			include: {
				task: {
					select: {
						title: true,
						isActive: true,
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
		prisma.dailyCheckResult.findMany({
			where: {
				userId: session.user.id,
				targetDay: {
					gte: startDay,
					lt: tomorrow,
				},
				dailyCheck: {
					isActive: true,
				},
			},
			select: {
				status: true,
				targetDay: true,
				dailyCheck: {
					select: {
						title: true,
						isActive: true,
					},
				},
			},
		}),
		]);

	const analytics = buildDashboardAnalytics({
		tasks,
		taskSessions,
		lifetimeTaskSessions,
		downtimeSessions,
		actionItems,
		commitments,
		dailyCheckResults,
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
	const maxWeeklyTaskCompletions = Math.max(
		1,
		...analytics.weeklyTaskCompletionTotals.map((task) => task.count),
	);
	const maxCategorySeconds = Math.max(
		1,
		...analytics.downtimeCategoryTotals.map((category) => category.totalSeconds),
	);

	return (
		<>
			<AppNav />

			<main className="min-h-screen overflow-x-hidden bg-slate-950 px-4 py-6 text-white sm:px-6 sm:py-10">
				<section className="mx-auto min-w-0 max-w-5xl">
					<p className="mb-2 text-sm font-medium text-sky-400">Analytics</p>

					<h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
						Dashboard
					</h1>

					<p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
						Review the last {DASHBOARD_DAYS} app days of task completion, time
						away from improvement work, scheduled load, action items, and
						playbook coverage.
					</p>

					<div className="mt-6 grid min-w-0 gap-3 sm:mt-8 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
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
						<MetricTile
							label="Daily Review"
							value={`${analytics.dailyReviewSummary.successRate}%`}
							detail={`${analytics.dailyReviewSummary.yes} yes and ${analytics.dailyReviewSummary.no} no answers`}
						/>
					</div>

					<div className="mt-6 grid min-w-0 gap-5 sm:mt-8 sm:gap-6 lg:grid-cols-[1.3fr_1fr]">
						<Panel title="Daily Completions">
							<div className="-mx-1 overflow-x-auto pb-2">
								<div className="flex h-52 min-w-[48rem] items-end gap-3 px-1 sm:h-56 sm:min-w-0 sm:gap-2">
									{analytics.dayBuckets.map((bucket) => {
										const stackedDateLabel = getStackedDateLabel(bucket.label);

										return (
											<div
												key={bucket.dayKey}
												className="flex min-w-0 flex-1 flex-col items-center gap-2"
											>
												<div className="flex h-36 w-full items-end rounded-lg bg-slate-950 px-1 sm:h-40">
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
												<p className="max-w-14 truncate text-center text-[11px] text-slate-500 sm:max-w-none sm:overflow-visible sm:whitespace-normal sm:leading-tight">
													<span className="sm:hidden">
														{formatShortDateLabel(bucket.label)}
													</span>
													<span className="hidden sm:flex sm:flex-col sm:items-center">
														<span>{stackedDateLabel.monthDay}</span>
														<span>{stackedDateLabel.year}</span>
													</span>
												</p>
											</div>
										);
									})}
								</div>
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

					<div className="mt-5 grid min-w-0 gap-5 sm:mt-6 sm:gap-6 lg:grid-cols-2">
						<Panel title="Daily Review Checks">
							{analytics.dailyCheckTotals.length > 0 ? (
								<div className="space-y-4">
									{analytics.dailyCheckTotals.map((check) => {
										const total =
											check.yes + check.no + check.skip + check.unsure;
										const answered = check.yes + check.no;
										const successRate =
											answered === 0
												? 0
												: Math.round((check.yes / answered) * 100);

										return (
											<div
												key={check.title}
												className="rounded-xl border border-slate-800 bg-slate-950 p-4"
											>
												<div className="flex items-start justify-between gap-3">
													<div>
														<h3 className="font-semibold text-slate-100">
															{check.title}
														</h3>
														<p className="mt-1 text-sm text-slate-500">
															{total} answers · {check.skip} skipped ·{" "}
															{check.unsure} unsure
														</p>
													</div>
													<span className="rounded-full bg-sky-500/10 px-3 py-1 text-sm font-semibold text-sky-300">
														{successRate}%
													</span>
												</div>
											</div>
										);
									})}
								</div>
							) : (
								<EmptyState>
									Answer daily review checks to populate this panel.
								</EmptyState>
							)}
						</Panel>

						<Panel title="This Week By Task">
							<div className="mb-4 rounded-xl border border-slate-800 bg-slate-950 p-4">
								<p className="text-sm text-slate-400">Sunday through Saturday</p>
								<p className="mt-1 font-semibold text-slate-100">
									{formatAppDate(analytics.taskCompletionWeekStart)} to{" "}
									{formatAppDate(today)}
								</p>
							</div>

							{analytics.weeklyTaskCompletionTotals.length > 0 ? (
								<div className="space-y-4">
									{analytics.weeklyTaskCompletionTotals.map((task) => (
										<HorizontalBar
											key={task.title}
											label={task.title}
											value={`${task.count}`}
											percent={(task.count / maxWeeklyTaskCompletions) * 100}
											colorClass="bg-sky-400"
										/>
									))}
								</div>
							) : (
								<EmptyState>
									Complete tasks this week to populate this panel.
								</EmptyState>
							)}
						</Panel>

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

					<div className="mt-5 grid min-w-0 gap-5 sm:mt-6 sm:gap-6 lg:grid-cols-[1fr_1fr]">
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

						<Panel title="Lifetime Task Time By Task">
							{analytics.lifetimeTaskTimeTotals.length > 0 ? (
								<div className="space-y-3">
									{analytics.lifetimeTaskTimeTotals.slice(0, 8).map((task) => (
										<HorizontalBar
											key={task.title}
											label={task.title}
											value={formatHours(task.totalSeconds)}
											percent={
												analytics.totalLifetimeTaskSeconds === 0
													? 0
													: (task.totalSeconds /
															analytics.totalLifetimeTaskSeconds) *
														100
											}
											colorClass="bg-violet-400"
										/>
									))}
								</div>
							) : (
								<EmptyState>
									Start active task timers to build lifetime totals.
								</EmptyState>
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
		<div className="min-w-0 rounded-xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
			<p className="text-sm font-medium text-slate-400">{label}</p>
			<p className="mt-3 break-words text-2xl font-bold text-slate-50 sm:text-3xl">
				{value}
			</p>
			<p className="mt-2 text-sm leading-6 text-slate-500">{detail}</p>
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
			className={`min-w-0 overflow-hidden rounded-xl border border-slate-800 bg-slate-900 p-4 sm:p-5 ${className}`}
		>
			<h2 className="mb-4 break-words text-base font-semibold text-slate-100 sm:mb-5 sm:text-lg">
				{title}
			</h2>
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
		<div className="min-w-0 rounded-xl border border-slate-800 bg-slate-950 p-4">
			<p className="text-sm text-slate-400">{label}</p>
			<p className={`mt-2 break-words text-2xl font-bold ${accent}`}>
				{value}
			</p>
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
		<div className="min-w-0">
			<div className="mb-2 flex min-w-0 items-center justify-between gap-3 text-sm">
				<span className="min-w-0 truncate font-medium text-slate-300">
					{label}
				</span>
				<span className="shrink-0 text-slate-500">{value}</span>
			</div>
			<div className="h-3 overflow-hidden rounded-full bg-slate-950">
				<div
					className={`h-full rounded-full ${colorClass}`}
					style={{
						width:
							percent <= 0
								? "0%"
								: `${Math.max(4, Math.min(100, percent))}%`,
					}}
				/>
			</div>
		</div>
	);
}

function EmptyState({ children }: { children: React.ReactNode }) {
	return (
		<div className="min-w-0 rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm leading-6 text-slate-400">
			{children}
		</div>
	);
}
