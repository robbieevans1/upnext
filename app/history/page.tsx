import AppNav from "@/components/AppNav";
import { addAppDays, formatAppDate, getAppDateKey, getAppTodayDate } from "@/lib/app-date";
import {
	aggregateRecentCompletionDays,
	CompletionWithTask,
	getDayHref,
	getHistoryDayRange,
	getSelectedDay,
	RecentCompletionDay,
	sortCompletions,
} from "@/app/history/history-utils";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";

type HistoryPageProps = {
	searchParams: Promise<{
		day?: string | string[];
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

export default async function HistoryPage({ searchParams }: HistoryPageProps) {
	await connection();

	const session = await getServerSession(authOptions);

	if (!session?.user?.id) {
		redirect("/login");
	}

	const params = await searchParams;
	const selectedDay = getSelectedDay(params.day);
	const today = getAppTodayDate();
	const previousDay = addAppDays(selectedDay, -1);
	const nextDay = addAppDays(selectedDay, 1);
	const canGoNext = nextDay.getTime() <= today.getTime();

	const [completions, recentDays] = await Promise.all([
		getCompletionsForDay(session.user.id, selectedDay),
		getRecentCompletionDays(session.user.id),
	]);

	const sortedCompletions = sortCompletions(completions);
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
									Move to another day or complete a task from Today&apos;s Stack
									to start building history.
								</p>
							</div>
						)}
					</section>
				</section>
			</main>
		</>
	);
}
