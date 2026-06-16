export const APP_TIME_ZONE = "America/New_York";

type AppDateParts = {
	year: number;
	month: number;
	day: number;
};

function getDateParts(date: Date, timeZone = APP_TIME_ZONE): AppDateParts {
	const formatter = new Intl.DateTimeFormat("en-US", {
		timeZone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	});

	const parts = formatter.formatToParts(date);

	return {
		year: Number(parts.find((part) => part.type === "year")?.value),
		month: Number(parts.find((part) => part.type === "month")?.value),
		day: Number(parts.find((part) => part.type === "day")?.value),
	};
}

function getDateTimeParts(date: Date, timeZone = APP_TIME_ZONE) {
	const formatter = new Intl.DateTimeFormat("en-US", {
		timeZone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hourCycle: "h23",
	});

	const parts = formatter.formatToParts(date);
	const value = (type: Intl.DateTimeFormatPartTypes) =>
		Number(parts.find((part) => part.type === type)?.value);

	return {
		year: value("year"),
		month: value("month"),
		day: value("day"),
		hour: value("hour"),
		minute: value("minute"),
		second: value("second"),
	};
}

function getTimeZoneOffsetMs(date: Date, timeZone = APP_TIME_ZONE) {
	const parts = getDateTimeParts(date, timeZone);
	const timeZoneTimeAsUtc = Date.UTC(
		parts.year,
		parts.month - 1,
		parts.day,
		parts.hour,
		parts.minute,
		parts.second,
	);

	return timeZoneTimeAsUtc - date.getTime();
}

function getUtcInstantForTimeZoneDate(
	parts: AppDateParts,
	hour = 0,
	minute = 0,
	second = 0,
	timeZone = APP_TIME_ZONE,
) {
	const utcGuess = Date.UTC(
		parts.year,
		parts.month - 1,
		parts.day,
		hour,
		minute,
		second,
	);
	const firstOffset = getTimeZoneOffsetMs(new Date(utcGuess), timeZone);
	const firstInstant = utcGuess - firstOffset;
	const correctedOffset = getTimeZoneOffsetMs(new Date(firstInstant), timeZone);

	return new Date(utcGuess - correctedOffset);
}

export function getAppDateKey(date = new Date()) {
	const parts = getDateParts(date);
	const year = String(parts.year).padStart(4, "0");
	const month = String(parts.month).padStart(2, "0");
	const day = String(parts.day).padStart(2, "0");

	return `${year}-${month}-${day}`;
}

export function getAppTodayDate(date = new Date()) {
	const parts = getDateParts(date);

	return new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
}

export function getMsUntilNextAppMidnight(date = new Date()) {
	const today = getDateParts(date);
	const nextMidnight = getUtcInstantForTimeZoneDate(
		{
			year: today.year,
			month: today.month,
			day: today.day + 1,
		},
		0,
		0,
		5,
	);

	return Math.max(1000, nextMidnight.getTime() - date.getTime());
}
