import {
	addAppDays,
	formatAppDate,
	getAppDateFromKey,
	getAppDateKey,
	getAppTodayDate,
} from "@/lib/app-date";
import { getAppDayOfWeek } from "@/lib/commitments";

export type CalendarMonth = {
	key: string;
	label: string;
	start: Date;
	nextStart: Date;
	previousKey: string;
	nextKey: string;
};

export type CalendarEntryToneInput = {
	type: "Commitment" | "Action" | "Announcement";
	statusLabel?: string;
};

function getMonthKey(year: number, month: number) {
	const normalizedYear = year + Math.floor((month - 1) / 12);
	const normalizedMonth = ((((month - 1) % 12) + 12) % 12) + 1;

	return `${normalizedYear}-${String(normalizedMonth).padStart(2, "0")}`;
}

function getMonthStartFromKey(monthKey: string) {
	return getAppDateFromKey(`${monthKey}-01`);
}

export function getCalendarMonth(monthKey?: string, now = new Date()) {
	const fallbackKey = getAppDateKey(getAppTodayDate(now)).slice(0, 7);
	const normalizedMonthKey = /^\d{4}-\d{2}$/.test(monthKey ?? "")
		? monthKey
		: fallbackKey;
	const start = getMonthStartFromKey(normalizedMonthKey ?? fallbackKey);
	const safeStart = start ?? getMonthStartFromKey(fallbackKey);

	if (!safeStart) {
		throw new Error("Unable to resolve calendar month");
	}

	const [year, month] = getAppDateKey(safeStart).split("-").map(Number);
	const key = getMonthKey(year, month);
	const nextKey = getMonthKey(year, month + 1);
	const previousKey = getMonthKey(year, month - 1);
	const nextStart = getMonthStartFromKey(nextKey);

	if (!nextStart) {
		throw new Error("Unable to resolve next calendar month");
	}

	return {
		key,
		label: new Intl.DateTimeFormat("en-US", {
			month: "long",
			year: "numeric",
			timeZone: "America/New_York",
		}).format(safeStart),
		start: safeStart,
		nextStart,
		previousKey,
		nextKey,
	} satisfies CalendarMonth;
}

export function getCalendarGridDays(month: CalendarMonth) {
	const gridStart = addAppDays(month.start, -getAppDayOfWeek(month.start));
	const lastMonthDay = addAppDays(month.nextStart, -1);
	const gridEnd = addAppDays(lastMonthDay, 6 - getAppDayOfWeek(lastMonthDay));
	const days: Date[] = [];

	for (
		let day = gridStart;
		day.getTime() <= gridEnd.getTime();
		day = addAppDays(day, 1)
	) {
		days.push(day);
	}

	return days;
}

export function getWeeklyOccurrenceDays({
	recurrenceDays,
	seriesStart,
	month,
}: {
	recurrenceDays: number[];
	seriesStart: Date;
	month: CalendarMonth;
}) {
	const occurrenceDays: Date[] = [];
	const recurrenceDaySet = new Set(recurrenceDays);
	const firstCandidate =
		seriesStart.getTime() > month.start.getTime() ? seriesStart : month.start;
	const lastCandidate = addAppDays(month.nextStart, -1);

	for (
		let day = firstCandidate;
		day.getTime() <= lastCandidate.getTime();
		day = addAppDays(day, 1)
	) {
		if (recurrenceDaySet.has(getAppDayOfWeek(day))) {
			occurrenceDays.push(day);
		}
	}

	return occurrenceDays;
}

export function getCalendarDateKey(date: Date) {
	return getAppDateKey(date);
}

export function formatCalendarDate(date: Date) {
	return formatAppDate(date);
}

export function getCalendarEntryToneClass({
	type,
	statusLabel,
}: CalendarEntryToneInput) {
	if (type === "Commitment" && statusLabel === "Canceled") {
		return "border-red-500/30 bg-red-500/10 text-red-100";
	}

	if (type === "Commitment") {
		return "border-sky-500/30 bg-sky-500/10 text-sky-100";
	}

	if (type === "Action") {
		return "border-amber-500/30 bg-amber-500/10 text-amber-100";
	}

	return "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-100";
}
