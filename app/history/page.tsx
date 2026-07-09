import AppNav from "@/components/AppNav";
import { saveWeeklyReview } from "@/app/actions/weekly-review";
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
	getTaskSessionDurationSeconds,
	getTaskTimeTotalsByTaskId,
	getTotalHref,
	getWeekHref,
	RecentCompletionDay,
	sortCompletions,
	TaskSessionForHistory,
} from "@/app/history/history-utils";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
	buildTotalTaskCompletionTotals,
	buildWeeklyTaskCompletionTotals,
	type TaskCompletionTotal,
	type WeeklyTaskCompletionTotal,
} from "@/lib/task-completion-week";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import {
	getWeeklyReviewLaunchWeekStart,
	isWeeklyReviewEnabledForWeek,
} from "@/lib/weekly-review";
import type { ReactNode } from "react";

type DailyCheckResultForHistory = {
	id: string;
	status: string;
	dailyCheck: {
		title: string;
		description: string | null;
	};
};

type WeeklyReviewForHistory = {
	movedForward: string | null;
	busyNotUseful: string | null;
	moreNextWeek: string | null;
	lessNextWeek: string | null;
	taskChanges: string | null;
	routineAligned: string | null;
	completedAt: Date | null;
};

type WeeklyEvidence = {
	taskTimeTotals: {
		title: string;
		totalSeconds: number;
	}[];
	downtimeTotals: {
		category: string;
		totalSeconds: number;
	}[];
	commitmentSummary: {
		scheduled: number;
		completed: number;
		canceled: number;
		recurringCompleted: number;
	};
	dailyReviewSummary: {
		yes: number;
		no: number;
		skip: number;
		unsure: number;
	};
	challengeSummaries: {
		title: string;
		successfulDays: number;
		reviewedDays: number;
	}[];
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

async function getTotalTaskCompletionTotals(
	userId: string,
): Promise<TaskCompletionTotal[]> {
	const [tasks, completions] = await Promise.all([
		prisma.task.findMany({
			where: {
				userId,
				isActive: true,
			},
			select: {
				id: true,
				title: true,
				isActive: true,
			},
			orderBy: {
				title: "asc",
			},
		}),
		prisma.taskCompletion.findMany({
			where: {
				userId,
				task: {
					isActive: true,
				},
			},
			select: {
				taskId: true,
				completedOn: true,
			},
		}),
	]);

	return buildTotalTaskCompletionTotals({
		tasks,
		completions,
	});
}

async function getWeeklyReviewForHistory(
	userId: string,
	weekStart: Date,
): Promise<WeeklyReviewForHistory | null> {
	return prisma.weeklyReview.findUnique({
		where: {
			userId_weekStart: {
				userId,
				weekStart,
			},
		},
		select: {
			movedForward: true,
			busyNotUseful: true,
			moreNextWeek: true,
			lessNextWeek: true,
			taskChanges: true,
			routineAligned: true,
			completedAt: true,
		},
	});
}

async function getWeeklyEvidence(
	userId: string,
	weekStart: Date,
): Promise<WeeklyEvidence> {
	const weekRange = getHistoryWeekRange(weekStart);
	const [
		taskSessions,
		downtimeSessions,
		commitments,
		recurringCommitmentCompletions,
		dailyCheckResults,
		challenges,
	] = await Promise.all([
		prisma.taskSession.findMany({
			where: {
				userId,
				day: {
					gte: weekRange.start,
					lt: weekRange.end,
				},
				task: {
					isActive: true,
				},
			},
			select: {
				taskId: true,
				startedAt: true,
				stoppedAt: true,
				task: {
					select: {
						title: true,
					},
				},
			},
		}),
		prisma.downtimeSession.findMany({
			where: {
				userId,
				day: {
					gte: weekRange.start,
					lt: weekRange.end,
				},
			},
			select: {
				category: true,
				startedAt: true,
				stoppedAt: true,
			},
		}),
		prisma.commitment.findMany({
			where: {
				userId,
				day: {
					gte: weekRange.start,
					lt: weekRange.end,
				},
			},
			select: {
				completedAt: true,
				canceledAt: true,
			},
		}),
		prisma.commitmentOccurrenceCompletion.findMany({
			where: {
				userId,
				occurrenceDay: {
					gte: weekRange.start,
					lt: weekRange.end,
				},
			},
			select: {
				id: true,
			},
		}),
		prisma.dailyCheckResult.findMany({
			where: {
				userId,
				targetDay: {
					gte: weekRange.start,
					lt: weekRange.end,
				},
				dailyCheck: {
					isActive: true,
				},
			},
			select: {
				status: true,
			},
		}),
		prisma.challenge.findMany({
			where: {
				userId,
				isActive: true,
				startDay: {
					lt: weekRange.end,
				},
			},
			select: {
				title: true,
				dailyCheck: {
					select: {
						results: {
							where: {
								targetDay: {
									gte: weekRange.start,
									lt: weekRange.end,
								},
							},
							select: {
								status: true,
							},
						},
					},
				},
			},
		}),
	]);

	const taskTimeByTaskId = new Map<
		string,
		{
			title: string;
			totalSeconds: number;
		}
	>();

	for (const session of taskSessions) {
		const existingTotal = taskTimeByTaskId.get(session.taskId) ?? {
			title: session.task.title,
			totalSeconds: 0,
		};
		existingTotal.totalSeconds += getTaskSessionDurationSeconds(session);
		taskTimeByTaskId.set(session.taskId, existingTotal);
	}

	const downtimeByCategory = new Map<string, number>();
	for (const session of downtimeSessions) {
		downtimeByCategory.set(
			session.category,
			(downtimeByCategory.get(session.category) ?? 0) +
				getTaskSessionDurationSeconds(session),
		);
	}

	return {
		taskTimeTotals: Array.from(taskTimeByTaskId.values())
			.filter((task) => task.totalSeconds > 0)
			.sort(
				(a, b) =>
					b.totalSeconds - a.totalSeconds || a.title.localeCompare(b.title),
			),
		downtimeTotals: Array.from(downtimeByCategory.entries())
			.map(([category, totalSeconds]) => ({
				category,
				totalSeconds,
			}))
			.sort(
				(a, b) =>
					b.totalSeconds - a.totalSeconds ||
					a.category.localeCompare(b.category),
			),
		commitmentSummary: {
			scheduled: commitments.length,
			completed: commitments.filter((commitment) => commitment.completedAt).length,
			canceled: commitments.filter((commitment) => commitment.canceledAt).length,
			recurringCompleted: recurringCommitmentCompletions.length,
		},
		dailyReviewSummary: {
			yes: dailyCheckResults.filter((result) => result.status === "YES").length,
			no: dailyCheckResults.filter((result) => result.status === "NO").length,
			skip: dailyCheckResults.filter((result) => result.status === "SKIP").length,
			unsure: dailyCheckResults.filter((result) => result.status === "UNSURE")
				.length,
		},
		challengeSummaries: challenges
			.map((challenge) => ({
				title: challenge.title,
				successfulDays: challenge.dailyCheck.results.filter(
					(result) => result.status === "YES",
				).length,
				reviewedDays: challenge.dailyCheck.results.length,
			}))
			.filter((challenge) => challenge.reviewedDays > 0),
	};
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
	const isTotalView = viewParam === "total";
	const previousDay = addAppDays(selectedDay, -1);
	const nextDay = addAppDays(selectedDay, 1);
	const canGoNext = nextDay.getTime() <= today.getTime();

	const [
		completions,
		recentDays,
		dailyCheckResults,
		taskSessions,
		weeklyTaskCompletionTotals,
		totalTaskCompletionTotals,
		weeklyReview,
		weeklyEvidence,
	] = await Promise.all([
		getCompletionsForDay(session.user.id, selectedDay),
		getRecentCompletionDays(session.user.id),
		getDailyCheckResultsForDay(session.user.id, selectedDay),
		getTaskSessionsForDay(session.user.id, selectedDay),
		getWeeklyTaskCompletionTotals(session.user.id, selectedWeekStart),
		getTotalTaskCompletionTotals(session.user.id),
		getWeeklyReviewForHistory(session.user.id, selectedWeekStart),
		getWeeklyEvidence(session.user.id, selectedWeekStart),
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
								Review completed tasks by app day, week, or all-time current
								task totals.
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
								isWeekView || isTotalView
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

						<Link
							href={getTotalHref()}
							className={
								isTotalView
									? "flex-1 rounded-xl bg-sky-500 px-4 py-2 text-center text-sm font-semibold text-slate-950"
									: "flex-1 rounded-xl px-4 py-2 text-center text-sm font-semibold text-slate-400 transition hover:text-sky-300"
							}
						>
							Total
						</Link>
					</div>

					{isTotalView ? (
						<>
							<div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-5">
								<div className="text-center">
									<p className="text-sm font-medium text-slate-400">
										All-time current task totals
									</p>

									<h2 className="mt-1 text-2xl font-bold">
										Total Completions
									</h2>

									<p className="mt-1 text-sm text-slate-500">
										{totalTaskCompletionTotals.reduce(
											(total, task) => total + task.count,
											0,
										)}{" "}
										completed across active tasks
									</p>
								</div>
							</div>

							<TaskCompletionTotalsCard
								totals={totalTaskCompletionTotals}
								title="Completed By Task"
								description="Only current undeleted tasks are included."
								emptyText="Add active tasks to populate total history."
								showRegularDuration
								today={today}
							/>
						</>
					) : isWeekView ? (
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

							<TaskCompletionTotalsCard
								totals={weeklyTaskCompletionTotals}
								title="Completed By Task"
								description="Active tasks are included even when the count is zero."
								emptyText="Add active tasks to populate weekly history."
							/>

							<WeeklyEvidenceSection
								totals={weeklyTaskCompletionTotals}
								evidence={weeklyEvidence}
							/>

							<WeeklyReviewSection
								weekStart={selectedWeekStart}
								weekEnd={selectedWeekEnd}
								review={weeklyReview}
							/>
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

function TaskCompletionTotalsCard({
	totals,
	title,
	description,
	emptyText,
	showRegularDuration = false,
	today,
}: {
	totals: (TaskCompletionTotal | WeeklyTaskCompletionTotal)[];
	title: string;
	description: string;
	emptyText: string;
	showRegularDuration?: boolean;
	today?: Date;
}) {
	const maxCompletions = Math.max(1, ...totals.map((task) => task.count));

	return (
		<section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-5">
			<div className="mb-4">
				<h2 className="text-lg font-semibold text-slate-100">
					{title}
				</h2>
				<p className="mt-1 text-sm text-slate-500">{description}</p>
			</div>

			{totals.length > 0 ? (
				<div className="space-y-4">
					{totals.map((task) => (
						<div key={task.title} className="min-w-0">
							<div className="mb-2 flex min-w-0 items-center justify-between gap-3 text-sm">
								<div className="min-w-0">
									<span className="block min-w-0 truncate font-medium text-slate-300">
										{task.title}
									</span>
									{showRegularDuration && (
										<span className="mt-1 block text-xs text-slate-500">
											{getTaskRegularDurationText(task, today)}
										</span>
									)}
								</div>
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
					{emptyText}
				</p>
			)}
		</section>
	);
}

function WeeklyEvidenceSection({
	totals,
	evidence,
}: {
	totals: WeeklyTaskCompletionTotal[];
	evidence: WeeklyEvidence;
}) {
	const completedTasks = totals.filter((task) => task.count > 0);
	const untouchedTasks = totals.filter((task) => task.count === 0);
	const mostRepeatedTasks = completedTasks.slice(0, 3);

	return (
		<section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-5">
			<div className="mb-5">
				<h2 className="text-lg font-semibold text-slate-100">
					Weekly Evidence
				</h2>
				<p className="mt-1 text-sm text-slate-500">
					Use what happened this week to decide whether the routine is moving
					you forward.
				</p>
			</div>

			<div className="grid gap-4 md:grid-cols-2">
				<EvidenceCard title="Tasks completed this week">
					{completedTasks.length > 0 ? (
						<EvidenceList
							items={completedTasks.map((task) => `${task.title}: ${task.count}`)}
						/>
					) : (
						<EmptyEvidence>No tasks completed this week.</EmptyEvidence>
					)}
				</EvidenceCard>

				<EvidenceCard title="Tasks untouched this week">
					{untouchedTasks.length > 0 ? (
						<EvidenceList items={untouchedTasks.map((task) => task.title)} />
					) : (
						<EmptyEvidence>Every current task was completed at least once.</EmptyEvidence>
					)}
				</EvidenceCard>

				<EvidenceCard title="Focused task time">
					{evidence.taskTimeTotals.length > 0 ? (
						<EvidenceList
							items={evidence.taskTimeTotals.map(
								(task) => `${task.title}: ${formatTaskTime(task.totalSeconds)}`,
							)}
						/>
					) : (
						<EmptyEvidence>No task time tracked this week.</EmptyEvidence>
					)}
				</EvidenceCard>

				<EvidenceCard title="Downtime totals">
					{evidence.downtimeTotals.length > 0 ? (
						<EvidenceList
							items={evidence.downtimeTotals.map(
								(total) =>
									`${formatEvidenceLabel(total.category)}: ${formatTaskTime(
										total.totalSeconds,
									)}`,
							)}
						/>
					) : (
						<EmptyEvidence>No downtime tracked this week.</EmptyEvidence>
					)}
				</EvidenceCard>

				<EvidenceCard title="Commitments">
					<EvidenceList
						items={[
							`${evidence.commitmentSummary.scheduled} dated commitments`,
							`${evidence.commitmentSummary.completed} completed`,
							`${evidence.commitmentSummary.canceled} canceled`,
							`${evidence.commitmentSummary.recurringCompleted} recurring occurrences completed`,
						]}
					/>
				</EvidenceCard>

				<EvidenceCard title="Daily Review outcomes">
					<EvidenceList
						items={[
							`${evidence.dailyReviewSummary.yes} yes`,
							`${evidence.dailyReviewSummary.no} no`,
							`${evidence.dailyReviewSummary.skip} skipped`,
							`${evidence.dailyReviewSummary.unsure} not sure`,
						]}
					/>
				</EvidenceCard>

				<EvidenceCard title="Most repeated tasks">
					{mostRepeatedTasks.length > 0 ? (
						<EvidenceList
							items={mostRepeatedTasks.map(
								(task) => `${task.title}: ${task.count}`,
							)}
						/>
					) : (
						<EmptyEvidence>No repeated tasks this week.</EmptyEvidence>
					)}
				</EvidenceCard>

				<EvidenceCard title="Challenges and direction">
					{evidence.challengeSummaries.length > 0 ? (
						<EvidenceList
							items={evidence.challengeSummaries.map(
								(challenge) =>
									`${challenge.title}: ${challenge.successfulDays}/${challenge.reviewedDays} successful review days`,
							)}
						/>
					) : (
						<EmptyEvidence>
							No challenge review results landed in this week.
						</EmptyEvidence>
					)}
					<p className="mt-3 text-xs text-slate-500">
						Use the busy-but-not-useful answer below to call out high-time work
						that did not feel valuable.
					</p>
				</EvidenceCard>
			</div>
		</section>
	);
}

function WeeklyReviewSection({
	weekStart,
	weekEnd,
	review,
}: {
	weekStart: Date;
	weekEnd: Date;
	review: WeeklyReviewForHistory | null;
}) {
	if (!isWeeklyReviewEnabledForWeek(weekStart)) {
		return (
			<section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-5">
				<h2 className="text-lg font-semibold text-slate-100">
					Weekly Review
				</h2>
				<p className="mt-2 text-sm text-slate-400">
					Weekly Review starts with the week of{" "}
					{formatAppDate(getWeeklyReviewLaunchWeekStart())}
					. Older weeks stay available for history, but they will not ask for
					retroactive reflection.
				</p>
			</section>
		);
	}

	return (
		<section className="mt-8 rounded-2xl border border-sky-500/30 bg-sky-500/10 p-5">
			<div className="mb-5">
				<p className="text-sm font-semibold uppercase tracking-wide text-sky-300">
					Weekly Review
				</p>
				<h2 className="mt-1 text-2xl font-bold text-slate-100">
					{formatAppDate(weekStart)} to {formatAppDate(weekEnd)}
				</h2>
				<p className="mt-2 text-sm text-slate-300">
					{review?.completedAt
						? `Completed ${formatAppDate(review.completedAt)}`
						: "Save a draft while thinking, or complete the review when the week is settled."}
				</p>
			</div>

			<form action={saveWeeklyReview} className="space-y-4">
				<input type="hidden" name="weekStart" value={getAppDateKey(weekStart)} />

				<WeeklyReviewTextarea
					name="movedForward"
					label="What moved me forward this week?"
					defaultValue={review?.movedForward}
				/>
				<WeeklyReviewTextarea
					name="busyNotUseful"
					label="What felt busy but not useful?"
					defaultValue={review?.busyNotUseful}
				/>
				<WeeklyReviewTextarea
					name="moreNextWeek"
					label="What should I do more of next week?"
					defaultValue={review?.moreNextWeek}
				/>
				<WeeklyReviewTextarea
					name="lessNextWeek"
					label="What should I do less of next week?"
					defaultValue={review?.lessNextWeek}
				/>
				<WeeklyReviewTextarea
					name="taskChanges"
					label="Is there a task I should add, remove, pause, or change?"
					defaultValue={review?.taskChanges}
				/>
				<WeeklyReviewTextarea
					name="routineAligned"
					label="Did my current routine match my actual goals?"
					defaultValue={review?.routineAligned}
				/>

				<div className="flex flex-wrap justify-end gap-3">
					<button
						type="submit"
						name="intent"
						value="draft"
						className="rounded-xl border border-slate-600 px-4 py-2 font-semibold text-slate-100 transition hover:border-sky-400 hover:text-sky-300"
					>
						Save Draft
					</button>
					<button
						type="submit"
						name="intent"
						value="complete"
						className="rounded-xl bg-sky-500 px-4 py-2 font-semibold text-slate-950 transition hover:bg-sky-400"
					>
						Complete Review
					</button>
				</div>
			</form>
		</section>
	);
}

function WeeklyReviewTextarea({
	name,
	label,
	defaultValue,
}: {
	name: string;
	label: string;
	defaultValue: string | null | undefined;
}) {
	return (
		<label className="block">
			<span className="text-sm font-semibold text-slate-100">{label}</span>
			<textarea
				name={name}
				defaultValue={defaultValue ?? ""}
				rows={4}
				className="mt-2 w-full resize-y rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-sky-400"
			/>
		</label>
	);
}

function EvidenceCard({
	title,
	children,
}: {
	title: string;
	children: ReactNode;
}) {
	return (
		<div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
			<h3 className="font-semibold text-slate-100">{title}</h3>
			<div className="mt-3">{children}</div>
		</div>
	);
}

function EvidenceList({ items }: { items: string[] }) {
	return (
		<ul className="space-y-2 text-sm text-slate-300">
			{items.map((item) => (
				<li key={item}>{item}</li>
			))}
		</ul>
	);
}

function EmptyEvidence({ children }: { children: ReactNode }) {
	return <p className="text-sm text-slate-500">{children}</p>;
}

function formatEvidenceLabel(value: string) {
	return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function getTaskRegularDurationText(
	task: TaskCompletionTotal | WeeklyTaskCompletionTotal,
	today: Date | undefined,
) {
	if (!("firstCompletedOn" in task) || !task.firstCompletedOn || !today) {
		return "Not completed yet.";
	}

	return `First completed ${formatAppDate(task.firstCompletedOn)} · Done regularly for ${formatRegularDuration(task.firstCompletedOn, today)}`;
}

function formatRegularDuration(startDay: Date, endDay: Date) {
	const millisecondsPerDay = 24 * 60 * 60 * 1000;
	const days = Math.max(
		1,
		Math.floor((endDay.getTime() - startDay.getTime()) / millisecondsPerDay) + 1,
	);

	if (days < 7) {
		return `${days} ${days === 1 ? "day" : "days"}`;
	}

	if (days < 60) {
		const weeks = Math.floor(days / 7);

		return `${weeks} ${weeks === 1 ? "week" : "weeks"}`;
	}

	if (days < 365) {
		const months = Math.floor(days / 30);

		return `${months} ${months === 1 ? "month" : "months"}`;
	}

	const years = Math.floor(days / 365);
	const remainingMonths = Math.floor((days % 365) / 30);

	if (remainingMonths === 0) {
		return `${years} ${years === 1 ? "year" : "years"}`;
	}

	return `${years} ${years === 1 ? "year" : "years"}, ${remainingMonths} ${
		remainingMonths === 1 ? "month" : "months"
	}`;
}

function formatDailyCheckStatus(status: string) {
	if (status === "YES") return "Yes";
	if (status === "NO") return "No";
	if (status === "SKIP") return "Skipped";
	if (status === "UNSURE") return "Not sure";

	return status;
}
