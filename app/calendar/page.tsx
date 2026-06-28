import AppNav from "@/components/AppNav";
import {
	formatAppDate,
	formatAppTime,
	getAppDateKey,
	getAppTodayDate,
} from "@/lib/app-date";
import { authOptions } from "@/lib/auth";
import {
	formatCalendarDate,
	getCalendarEntryToneClass,
	getCalendarDateKey,
	getCalendarGridDays,
	getCalendarMonth,
	getWeeklyOccurrenceDays,
} from "@/lib/calendar-view";
import { getCommitmentRecurrenceDays } from "@/lib/commitments";
import { prisma } from "@/lib/prisma";
import { CommitmentRecurrence } from "@prisma/client";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";

type CalendarPageProps = {
	searchParams: Promise<{
		month?: string | string[];
	}>;
};

type CalendarEntry = {
	id: string;
	date: Date;
	title: string;
	type: "Commitment" | "Action" | "Announcement";
	timeLabel?: string;
	statusLabel?: string;
	href: string;
};

function getSingleSearchParam(value: string | string[] | undefined) {
	return Array.isArray(value) ? value[0] : value;
}

function getCalendarHref(monthKey: string) {
	return `/calendar?month=${monthKey}`;
}

function sortEntries(entries: CalendarEntry[]) {
	return [...entries].sort((a, b) => {
		const aTime = a.date.getTime();
		const bTime = b.date.getTime();

		if (aTime !== bTime) {
			return aTime - bTime;
		}

		return a.title.localeCompare(b.title);
	});
}

export default async function CalendarPage({ searchParams }: CalendarPageProps) {
	await connection();
	const params = await searchParams;
	const month = getCalendarMonth(getSingleSearchParam(params.month));
	const todayKey = getAppDateKey(getAppTodayDate());

	const session = await getServerSession(authOptions);

	if (!session?.user?.id) {
		redirect("/login");
	}

	const [commitments, actionItems, announcements] = await Promise.all([
		prisma.commitment.findMany({
			where: {
				userId: session.user.id,
				OR: [
					{
						recurrence: CommitmentRecurrence.NONE,
						day: {
							gte: month.start,
							lt: month.nextStart,
						},
					},
					{
						recurrence: CommitmentRecurrence.WEEKLY,
						canceledAt: null,
						day: {
							lt: month.nextStart,
						},
					},
				],
			},
			include: {
				occurrenceCompletions: {
					where: {
						occurrenceDay: {
							gte: month.start,
							lt: month.nextStart,
						},
					},
				},
			},
			orderBy: [
				{
					day: "asc",
				},
				{
					startsAt: "asc",
				},
			],
		}),
		prisma.actionItem.findMany({
			where: {
				userId: session.user.id,
				dueOn: {
					gte: month.start,
					lt: month.nextStart,
				},
			},
			orderBy: [
				{
					dueOn: "asc",
				},
				{
					createdAt: "asc",
				},
			],
		}),
		prisma.announcement.findMany({
			where: {
				userId: session.user.id,
				isActive: true,
				targetAt: {
					gte: month.start,
					lt: month.nextStart,
				},
			},
			orderBy: {
				targetAt: "asc",
			},
		}),
	]);

	const commitmentEntries = commitments.flatMap((commitment): CalendarEntry[] => {
		if (commitment.recurrence === CommitmentRecurrence.WEEKLY) {
			return getWeeklyOccurrenceDays({
				recurrenceDays: getCommitmentRecurrenceDays(commitment),
				seriesStart: commitment.day,
				month,
			}).map((occurrenceDay) => {
				const isCompleted = commitment.occurrenceCompletions.some(
					(completion) =>
						completion.occurrenceDay.getTime() === occurrenceDay.getTime(),
				);

				return {
					id: `${commitment.id}:${getCalendarDateKey(occurrenceDay)}`,
					date: occurrenceDay,
					title: commitment.title,
					type: "Commitment",
					timeLabel: commitment.startsAt
						? formatAppTime(commitment.startsAt)
						: undefined,
					statusLabel: isCompleted ? "Completed" : "Repeats",
					href: "/commitments",
				};
			});
		}

		return [
			{
				id: commitment.id,
				date: commitment.day,
				title: commitment.title,
				type: "Commitment",
				timeLabel: commitment.startsAt
					? formatAppTime(commitment.startsAt)
					: undefined,
				statusLabel: commitment.completedAt
					? "Completed"
					: commitment.canceledAt
						? "Canceled"
						: undefined,
				href: "/commitments",
			},
		];
	});

	const actionEntries = actionItems
		.filter((item) => item.dueOn)
		.map((item): CalendarEntry => ({
			id: item.id,
			date: item.dueOn ?? month.start,
			title: item.title,
			type: "Action",
			statusLabel: item.completedAt
				? "Completed"
				: item.canceledAt
					? "Canceled"
					: "Due",
			href: "/action-items",
		}));

	const announcementEntries = announcements.map((announcement): CalendarEntry => ({
		id: announcement.id,
		date: announcement.targetAt,
		title: announcement.title,
		type: "Announcement",
		timeLabel: formatAppTime(announcement.targetAt),
		statusLabel: "Countdown",
		href: "/announcements",
	}));

	const entries = sortEntries([
		...commitmentEntries,
		...actionEntries,
		...announcementEntries,
	]);
	const entriesByDate = new Map<string, CalendarEntry[]>();

	for (const entry of entries) {
		const key = getCalendarDateKey(entry.date);
		entriesByDate.set(key, [...(entriesByDate.get(key) ?? []), entry]);
	}

	const gridDays = getCalendarGridDays(month);
	const selectedMonthPrefix = month.key;

	return (
		<>
			<AppNav />

			<main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6 sm:py-10">
				<section className="mx-auto max-w-6xl">
					<div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
						<div>
							<p className="mb-2 text-sm font-medium text-sky-400">Plan</p>
							<h1 className="text-4xl font-bold tracking-tight">Calendar</h1>
							<p className="mt-3 max-w-2xl text-slate-400">
								View dated action items, commitments, recurring commitment
								occurrences, and announcement events for the selected month.
							</p>
						</div>

						<div className="flex flex-wrap gap-2">
							<Link
								href={getCalendarHref(month.previousKey)}
								className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-sky-400 hover:text-sky-300"
							>
								Previous
							</Link>
							<Link
								href="/calendar"
								className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-sky-400 hover:text-sky-300"
							>
								This Month
							</Link>
							<Link
								href={getCalendarHref(month.nextKey)}
								className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
							>
								Next
							</Link>
						</div>
					</div>

					<section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
						<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
							<h2 className="text-2xl font-bold">{month.label}</h2>
							<p className="text-sm text-slate-400">
								{entries.length} dated item{entries.length === 1 ? "" : "s"}
							</p>
						</div>

						<div className="mt-6 hidden grid-cols-7 gap-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid">
							<span>Sun</span>
							<span>Mon</span>
							<span>Tue</span>
							<span>Wed</span>
							<span>Thu</span>
							<span>Fri</span>
							<span>Sat</span>
						</div>

						<div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-7">
							{gridDays.map((day) => {
								const dayKey = getCalendarDateKey(day);
								const dayEntries = entriesByDate.get(dayKey) ?? [];
								const isCurrentMonth = dayKey.startsWith(selectedMonthPrefix);
								const isToday = dayKey === todayKey;

								return (
									<div
										key={dayKey}
										className={`min-h-36 rounded-xl border p-3 ${
											isToday
												? "border-sky-400 bg-sky-500/10"
												: "border-slate-800 bg-slate-950"
										} ${isCurrentMonth ? "" : "opacity-55"}`}
									>
										<div className="flex items-center justify-between gap-2">
											<p
												className={`text-sm font-semibold ${
													isToday ? "text-sky-200" : "text-slate-200"
												}`}
											>
												<span className="md:hidden">
													{formatCalendarDate(day)}
												</span>
												<span className="hidden md:inline">
													{Number(dayKey.slice(-2))}
												</span>
											</p>
											{isToday && (
												<span className="rounded-full bg-sky-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-950">
													Today
												</span>
											)}
										</div>

										{dayEntries.length === 0 ? (
											<p className="mt-4 text-xs text-slate-600">No items</p>
										) : (
											<div className="mt-3 space-y-2">
												{dayEntries.map((entry) => (
													<Link
														key={entry.id}
														href={entry.href}
														className={`block rounded-lg border px-2 py-2 text-xs transition hover:border-sky-300 ${getCalendarEntryToneClass(
															entry,
														)}`}
													>
														<span className="block font-semibold leading-snug">
															{entry.timeLabel ? `${entry.timeLabel} · ` : ""}
															{entry.title}
														</span>
														<span className="mt-1 block text-[11px] opacity-75">
															{entry.type}
															{entry.statusLabel ? ` · ${entry.statusLabel}` : ""}
														</span>
													</Link>
												))}
											</div>
										)}
									</div>
								);
							})}
						</div>
					</section>

					<section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
						<h2 className="text-xl font-bold">Month Agenda</h2>
						{entries.length === 0 ? (
							<p className="mt-4 text-sm text-slate-400">
								No dated items are scheduled for {month.label}.
							</p>
						) : (
							<div className="mt-4 space-y-3">
								{entries.map((entry) => (
									<Link
										key={`${entry.id}:agenda`}
										href={entry.href}
										className={`grid gap-3 rounded-xl border p-4 text-sm transition hover:border-sky-400 sm:grid-cols-[9rem_1fr_auto] ${getCalendarEntryToneClass(
											entry,
										)}`}
									>
										<p className="font-semibold text-slate-100">
											{formatAppDate(entry.date)}
										</p>
										<p className="text-slate-300">
											{entry.timeLabel ? `${entry.timeLabel} · ` : ""}
											{entry.title}
										</p>
										<p className="text-slate-500">
											{entry.type}
											{entry.statusLabel ? ` · ${entry.statusLabel}` : ""}
										</p>
									</Link>
								))}
							</div>
						)}
					</section>
				</section>
			</main>
		</>
	);
}
