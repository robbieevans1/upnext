import AppNav from "@/components/AppNav";
import {
	addAppDays,
	formatAppDate,
	getAppDateKey,
	getAppTodayDate,
} from "@/lib/app-date";
import {
	aggregateRecentCompletionDays,
	CompletionWithTask,
	formatTaskTime,
	getDayHref,
	getHistoryDayRange,
	getHistoryWeekRange,
	getSelectedDay,
	getSelectedWeekStart,
	getTaskTimeTotalsByTaskId,
	getWeekHref,
	RecentCompletionDay,
	sortCompletions,
	TaskSessionForHistory,
} from "@/app/history/history-utils";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
	buildWeeklyTaskCompletionTotals,
	type WeeklyTaskCompletionTotal,
} from "@/lib/task-completion-week";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";

type DailyCheckResultForHistory = {
	id: string;
	status: string;
	dailyCheck: {
		title: string;
		description: string | null;
	};
};

type HistoryPageProps = {
	searchParams: Promise<{
		day?: string | string[];
		view?: string | string[];
		week?: string | string[];
	}>;
};

async function getCompletionsForDay(
	userId: string,
	day: Date,
): Promise<CompletionWithTask[]> {
	const dayRange = getHistoryDayRange(day);
	const completions = await prisma.taskCompletion.findMany({
		where: {
			userId,
			completedOn: {
				gte: dayRange.start,
				lt: dayRange.end,
			},
		},
		include: {
			task: {
				include: {
					group: true,
				},
			},
		},
		orderBy: {
			createdAt: "asc",
		},
	});

	return completions.map((completion) => ({
		id: completion.id,
		task: {
			id: completion.task.id,
			title: completion.task.title,
			description: completion.task.description,
			isMandatory: completion.task.isMandatory,
			stackOrder: completion.task.stackOrder,
			group: completion.task.group
				? {
						name: completion.task.group.name,
					}
				: null,
		},
	}));
}

async function getTaskSessionsForDay(
	userId: string,
	day: Date,
): Promise<TaskSessionForHistory[]> {
	const dayRange = getHistoryDayRange(day);

	return prisma.taskSession.findMany({
		where: {
			userId,
			day: {
				gte: dayRange.start,
				lt: dayRange.end,
			},
		},
		select: {
			taskId: true,
			startedAt: true,
			stoppedAt: true,
		},
	});
}

async function getRecentCompletionDays(
	userId: string,
): Promise<RecentCompletionDay[]> {
	const completions = await prisma.taskCompletion.findMany({
		where: {
			userId,
		},
		orderBy: {
			completedOn: "desc",
		},
		select: {
			completedOn: true,
		},
	});
	return aggregateRecentCompletionDays(completions);
}

async function getWeeklyTaskCompletionTotals(
	userId: string,
	weekStart: Date,
): Promise<WeeklyTaskCompletionTotal[]> {
	const weekRange = getHistoryWeekRange(weekStart);
	const [tasks, completions] = await Promise.all([
		prisma.task.findMany({
			where: {
				userId,
				OR: [
					{
						isActive: true,
						createdAt: {
							lt: weekRange.end,
						},
					},
					{
						completions: {
							some: {
								completedOn: {
									gte: weekRange.start,
									lt: weekRange.end,
								},
							},
						},
					},
				],
			},
			select: {
				id: true,
				title: true,
				isActive: true,
				createdAt: true,
			},
			orderBy: {
				title: "asc",
			},
		}),
		prisma.taskCompletion.findMany({
			where: {
				userId,
				completedOn: {
					gte: weekRange.start,
					lt: weekRange.end,
				},
			},
			select: {
				taskId: true,
				completedOn: true,
			},
		}),
	]);

	return buildWeeklyTaskCompletionTotals({
		tasks,
		completions,
		weekStart,
		weekEnd: weekRange.end,
		includeInactiveCompletedTasks: true,
	});
}

async function getDailyCheckResultsForDay(
	userId: string,
	day: Date,
): Promise<DailyCheckResultForHistory[]> {
	const dayRange = getHistoryDayRange(day);

	return prisma.dailyCheckResult.findMany({
		where: {
			userId,
			targetDay: {
				gte: dayRange.start,
				lt: dayRange.end,
			},
		},
		include: {
			dailyCheck: {
				select: {
					title: true,
					description: true,
				},
			},
		},
		orderBy: {
			createdAt: "asc",
		},
	});
}

export default async function HistoryPage({ searchParams }: HistoryPageProps) {
	await connection();

	const session = await getServerSession(authOptions);

	if (!session?.user?.id) {
		redirect("/login");
	}

	const params = await searchParams;
	const selectedDay = getSelectedDay(params.day);
	const today = getAppTodayDate();
	const currentWeekStart = getSelectedWeekStart(undefined);
	const selectedWeekStart = getSelectedWeekStart(params.week);
	const selectedWeekEnd = addAppDays(selectedWeekStart, 6);
	const previousWeekStart = addAppDays(selectedWeekStart, -7);
	const nextWeekStart = addAppDays(selectedWeekStart, 7);
	const canGoNextWeek = nextWeekStart.getTime() <= currentWeekStart.getTime();
	const viewParam = Array.isArray(params.view) ? params.view[0] : params.view;
	const isWeekView = viewParam === "week";
	const previousDay = addAppDays(selectedDay, -1);
	const nextDay = addAppDays(selectedDay, 1);
	const canGoNext = nextDay.getTime() <= today.getTime();

	const [
		completions,
		recentDays,
		dailyCheckResults,
		taskSessions,
		weeklyTaskCompletionTotals,
	] = await Promise.all([
		getCompletionsForDay(session.user.id, selectedDay),
		getRecentCompletionDays(session.user.id),
		getDailyCheckResultsForDay(session.user.id, selectedDay),
		getTaskSessionsForDay(session.user.id, selectedDay),
		getWeeklyTaskCompletionTotals(session.user.id, selectedWeekStart),
	]);

	const sortedCompletions = sortCompletions(completions);
	const taskTimeTotalsByTaskId = getTaskTimeTotalsByTaskId(taskSessions);
	const selectedDayKey = getAppDateKey(selectedDay);

	return (
		<>
			<AppNav />

			<main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
				<section className="mx-auto max-w-3xl">
					<div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
						<div>
							<p className="mb-2 text-sm font-medium text-sky-400">History</p>

							<h1 className="text-4xl font-bold tracking-tight">
								Completed Tasks
							</h1>

							<p className="mt-3 max-w-2xl text-slate-400">
								Review completed tasks by app day. Use the day controls to move
								backward and forward through your completion history.
							</p>
						</div>

						<Link
							href={getDayHref(today)}
							className="rounded-lg border border-slate-700 px-4 py-2 text-center text-sm font-medium text-slate-200 transition hover:border-sky-500 hover:text-sky-300"
						>
							Today
						</Link>
					</div>

					<div className="mt-8 flex rounded-2xl border border-slate-800 bg-slate-900 p-1">
						<Link
							href={getDayHref(selectedDay)}
							className={
								isWeekView
									? "flex-1 rounded-xl px-4 py-2 text-center text-sm font-semibold text-slate-400 transition hover:text-sky-300"
									: "flex-1 rounded-xl bg-sky-500 px-4 py-2 text-center text-sm font-semibold text-slate-950"
							}
						>
							Day
						</Link>

						<Link
							href={getWeekHref(selectedWeekStart)}
							className={
								isWeekView
									? "flex-1 rounded-xl bg-sky-500 px-4 py-2 text-center text-sm font-semibold text-slate-950"
									: "flex-1 rounded-xl px-4 py-2 text-center text-sm font-semibold text-slate-400 transition hover:text-sky-300"
							}
						>
							Week
						</Link>
					</div>

					{isWeekView ? (
						<>
							<div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-5">
								<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
									<Link
										href={getWeekHref(previousWeekStart)}
										className="rounded-xl border border-slate-700 px-4 py-3 text-center text-sm font-semibold text-slate-100 transition hover:border-sky-400 hover:text-sky-300"
									>
										Previous Week
									</Link>

									<div className="text-center">
										<p className="text-sm font-medium text-slate-400">
											Sunday to Saturday
										</p>

										<h2 className="mt-1 text-2xl font-bold">
											{formatAppDate(selectedWeekStart)} to{" "}
											{formatAppDate(selectedWeekEnd)}
										</h2>
									</div>

									{canGoNextWeek ? (
										<Link
											href={getWeekHref(nextWeekStart)}
											className="rounded-xl border border-slate-700 px-4 py-3 text-center text-sm font-semibold text-slate-100 transition hover:border-sky-400 hover:text-sky-300"
										>
											Next Week
										</Link>
									) : (
										<span className="rounded-xl border border-slate-800 px-4 py-3 text-center text-sm font-semibold text-slate-600">
											Next Week
										</span>
									)}
								</div>
							</div>

							<WeeklyHistoryCard totals={weeklyTaskCompletionTotals} />
						</>
					) : (
						<>
							<div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-5">
								<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
									<Link
										href={getDayHref(previousDay)}
										className="rounded-xl border border-slate-700 px-4 py-3 text-center text-sm font-semibold text-slate-100 transition hover:border-sky-400 hover:text-sky-300"
									>
										Previous Day
									</Link>

									<div className="text-center">
										<p className="text-sm font-medium text-slate-400">
											{selectedDayKey}
										</p>

										<h2 className="mt-1 text-2xl font-bold">
											{formatAppDate(selectedDay)}
										</h2>

										<p className="mt-1 text-sm text-slate-500">
											{sortedCompletions.length} completed
										</p>
									</div>

									{canGoNext ? (
										<Link
											href={getDayHref(nextDay)}
											className="rounded-xl border border-slate-700 px-4 py-3 text-center text-sm font-semibold text-slate-100 transition hover:border-sky-400 hover:text-sky-300"
										>
											Next Day
										</Link>
									) : (
										<span className="rounded-xl border border-slate-800 px-4 py-3 text-center text-sm font-semibold text-slate-600">
											Next Day
										</span>
									)}
								</div>
							</div>

							{recentDays.length > 0 && (
								<section className="mt-8">
									<h2 className="mb-3 text-lg font-semibold text-slate-200">
										Recent Days
									</h2>

									<div className="flex flex-wrap gap-2">
										{recentDays.map((day) => {
											const isSelected = day.dayKey === selectedDayKey;

											return (
												<Link
													key={day.dayKey}
													href={getDayHref(day.completedOn)}
													className={
														isSelected
															? "rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950"
															: "rounded-full border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-sky-400 hover:text-sky-300"
													}
												>
													{formatAppDate(day.completedOn)} · {day.count}
												</Link>
											);
										})}
									</div>
								</section>
							)}

							<section className="mt-8">
								<h2 className="mb-3 text-lg font-semibold text-slate-200">
									Daily Review
								</h2>

								{dailyCheckResults.length > 0 ? (
									<div className="mb-8 space-y-3">
										{dailyCheckResults.map((result) => (
											<div
												key={result.id}
												className="rounded-xl border border-slate-800 bg-slate-900 p-4"
											>
												<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
													<div>
														<h3 className="text-lg font-semibold text-slate-100">
															{result.dailyCheck.title}
														</h3>

														{result.dailyCheck.description && (
															<p className="mt-1 text-sm text-slate-400">
																{result.dailyCheck.description}
															</p>
														)}
													</div>

													<span className="rounded-full bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-300">
														{formatDailyCheckStatus(result.status)}
													</span>
												</div>
											</div>
										))}
									</div>
								) : (
									<div className="mb-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
										<p className="font-semibold text-slate-200">
											No daily review answers for this day.
										</p>

										<p className="mt-2 text-sm text-slate-400">
											Answer yesterday&apos;s review from Today to start
											tracking outcome checks here.
										</p>
									</div>
								)}

								<h2 className="mb-3 text-lg font-semibold text-slate-200">
									Tasks Completed
								</h2>

								{sortedCompletions.length > 0 ? (
									<div className="space-y-3">
										{sortedCompletions.map((completion) => (
											<div
												key={completion.id}
												className="rounded-xl border border-slate-800 bg-slate-900 p-4"
											>
												<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
													<div>
														<h3 className="text-lg font-semibold text-slate-100">
															{completion.task.title}
														</h3>

														{completion.task.description && (
															<p className="mt-1 text-sm text-slate-400">
																{completion.task.description}
															</p>
														)}

														<p className="mt-2 text-sm text-slate-500">
															{completion.task.group?.name ?? "Ungrouped"}
														</p>

														<p className="mt-2 text-sm font-medium text-sky-300">
															Task time:{" "}
															{formatTaskTime(
																taskTimeTotalsByTaskId.get(
																	completion.task.id,
																) ?? 0,
															)}
														</p>
													</div>

													<div className="flex flex-wrap gap-2">
														{completion.task.isMandatory && (
															<span className="rounded-full bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-300">
																Mandatory
															</span>
														)}

														<span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
															Completed
														</span>
													</div>
												</div>
											</div>
										))}
									</div>
								) : (
									<div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
										<p className="font-semibold text-slate-200">
											No tasks completed on this day.
										</p>

										<p className="mt-2 text-sm text-slate-400">
											Move to another day or complete a task from Today&apos;s
											Stack to start building history.
										</p>
									</div>
								)}
							</section>
						</>
					)}
				</section>
			</main>
		</>
	);
}

function WeeklyHistoryCard({
	totals,
}: {
	totals: WeeklyTaskCompletionTotal[];
}) {
	const maxCompletions = Math.max(1, ...totals.map((task) => task.count));

	return (
		<section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-5">
			<div className="mb-4">
				<h2 className="text-lg font-semibold text-slate-100">
					Completed By Task
				</h2>
				<p className="mt-1 text-sm text-slate-500">
					Active tasks are included even when the count is zero.
				</p>
			</div>

			{totals.length > 0 ? (
				<div className="space-y-4">
					{totals.map((task) => (
						<div key={task.title} className="min-w-0">
							<div className="mb-2 flex min-w-0 items-center justify-between gap-3 text-sm">
								<span className="min-w-0 truncate font-medium text-slate-300">
									{task.title}
								</span>
								<span className="shrink-0 text-slate-500">{task.count}</span>
							</div>
							<div className="h-3 overflow-hidden rounded-full bg-slate-950">
								<div
									className="h-full rounded-full bg-sky-400"
									style={{
										width:
											task.count === 0
												? "0%"
												: `${Math.max(4, Math.min(100, (task.count / maxCompletions) * 100))}%`,
									}}
								/>
							</div>
						</div>
					))}
				</div>
			) : (
				<p className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-400">
					Add active tasks to populate weekly history.
				</p>
			)}
		</section>
	);
}

function formatDailyCheckStatus(status: string) {
	if (status === "YES") return "Yes";
	if (status === "NO") return "No";
	if (status === "SKIP") return "Skipped";
	if (status === "UNSURE") return "Not sure";

	return status;
}
