import { getAppDateKey } from "@/lib/app-date";

export const WEEKDAY_OPTIONS = [
	{ label: "Sunday", value: 0 },
	{ label: "Monday", value: 1 },
	{ label: "Tuesday", value: 2 },
	{ label: "Wednesday", value: 3 },
	{ label: "Thursday", value: 4 },
	{ label: "Friday", value: 5 },
	{ label: "Saturday", value: 6 },
] as const;

export function getAppDayOfWeek(day: Date) {
	const [year, month, date] = getAppDateKey(day).split("-").map(Number);

	return new Date(Date.UTC(year, month - 1, date)).getUTCDay();
}

export function getWeekdayLabel(dayOfWeek: number | null | undefined) {
	return WEEKDAY_OPTIONS.find((option) => option.value === dayOfWeek)?.label;
}

export function getWeekdayListLabel(days: number[]) {
	const sortedDays = [...new Set(days)].sort((a, b) => a - b);

	if (sortedDays.length === 7) {
		return "Every day";
	}

	if (
		sortedDays.length === 5 &&
		sortedDays.every((day, index) => day === index + 1)
	) {
		return "Monday-Friday";
	}

	return sortedDays
		.map((day) => getWeekdayLabel(day))
		.filter(Boolean)
		.join(", ");
}

export function parseWeekday(value: FormDataEntryValue | null) {
	if (value === null) {
		return null;
	}

	const dayOfWeek = Number(value);

	return Number.isInteger(dayOfWeek) && dayOfWeek >= 0 && dayOfWeek <= 6
		? dayOfWeek
		: null;
}

export function parseWeekdays(values: FormDataEntryValue[]) {
	return [
		...new Set(
			values
				.map((value) => parseWeekday(value))
				.filter((value): value is number => value !== null),
		),
	].sort((a, b) => a - b);
}

export function getCommitmentRecurrenceDays({
	recurrenceDays,
	recurrenceDayOfWeek,
}: {
	recurrenceDays?: number[] | null;
	recurrenceDayOfWeek?: number | null;
}) {
	if (recurrenceDays && recurrenceDays.length > 0) {
		return recurrenceDays;
	}

	return recurrenceDayOfWeek === null || recurrenceDayOfWeek === undefined
		? []
		: [recurrenceDayOfWeek];
}
