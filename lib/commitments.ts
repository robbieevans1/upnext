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

export function parseWeekday(value: FormDataEntryValue | null) {
	if (value === null) {
		return null;
	}

	const dayOfWeek = Number(value);

	return Number.isInteger(dayOfWeek) && dayOfWeek >= 0 && dayOfWeek <= 6
		? dayOfWeek
		: null;
}
