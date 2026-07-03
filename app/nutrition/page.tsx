import AppNav from "@/components/AppNav";
import {
	addCalorieEntry,
	deleteCalorieEntry,
	saveStartingWeight,
	saveWeightEntry,
} from "@/app/actions/nutrition";
import FastingTimer from "@/app/nutrition/FastingTimer";
import {
	addAppDays,
	formatAppDate,
	formatAppTime,
	getAppDateKey,
	getAppTimeKey,
} from "@/lib/app-date";
import { authOptions } from "@/lib/auth";
import { getUserEffectiveTodayDate } from "@/lib/effective-day";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";

const RECENT_DAYS = 7;

type NutritionPageProps = {
	searchParams: Promise<{
		compareDay?: string | string[];
	}>;
};

type FastingSessionSummary = {
	startedAt: Date;
	endedAt: Date | null;
};

function formatWeight(weightLbs: number) {
	return `${weightLbs.toFixed(1)} lb`;
}

function formatWeightDelta(deltaLbs: number) {
	const roundedDelta = Math.round(deltaLbs * 10) / 10;

	if (roundedDelta === 0) {
		return "No change";
	}

	return `${roundedDelta > 0 ? "+" : ""}${roundedDelta.toFixed(1)} lb`;
}

function getWeightDeltaTone(deltaLbs: number) {
	if (deltaLbs > 0) {
		return "text-rose-300";
	}

	if (deltaLbs < 0) {
		return "text-emerald-300";
	}

	return "text-slate-300";
}

function getSingleSearchParam(value: string | string[] | undefined) {
	return Array.isArray(value) ? value[0] : value;
}

function getFastingDurationSeconds(
	session: FastingSessionSummary,
	now = new Date(),
) {
	const endTime = session.endedAt?.getTime() ?? now.getTime();

	return Math.max(0, Math.floor((endTime - session.startedAt.getTime()) / 1000));
}

function formatFastingDuration(totalSeconds: number) {
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);

	if (hours === 0) {
		return `${minutes}m`;
	}

	return `${hours}h ${minutes}m`;
}

export default async function NutritionPage({ searchParams }: NutritionPageProps) {
	await connection();
	const params = await searchParams;
	const selectedCompareDayKey = getSingleSearchParam(params.compareDay);

	const session = await getServerSession(authOptions);

	if (!session?.user?.id) {
		redirect("/login");
	}

	const effectiveDay = await getUserEffectiveTodayDate(session.user.id);
	const today = effectiveDay.today;
	const tomorrow = addAppDays(today, 1);
	const recentStartDay = addAppDays(today, -(RECENT_DAYS - 1));
	const weightComparisonStartDay = addAppDays(recentStartDay, -1);

	const [
		userWeightBaseline,
		calorieEntries,
		tomorrowCalorieEntries,
		todayWeightEntry,
		recentCalorieEntries,
		recentWeights,
		compareWeightOptions,
		activeFast,
		recentFasts,
	] = await Promise.all([
			prisma.user.findUnique({
				where: {
					id: session.user.id,
				},
				select: {
					startingWeightLbs: true,
					startingWeightSetAt: true,
				},
			}),
			prisma.calorieEntry.findMany({
				where: {
					userId: session.user.id,
					day: today,
				},
				orderBy: {
					loggedAt: "desc",
				},
			}),
			prisma.calorieEntry.findMany({
				where: {
					userId: session.user.id,
					day: tomorrow,
				},
				orderBy: {
					loggedAt: "desc",
				},
			}),
			prisma.weightEntry.findUnique({
				where: {
					userId_day: {
						userId: session.user.id,
						day: today,
					},
				},
			}),
			prisma.calorieEntry.findMany({
				where: {
					userId: session.user.id,
					day: {
						gte: recentStartDay,
						lte: tomorrow,
					},
				},
				orderBy: {
					day: "asc",
				},
			}),
			prisma.weightEntry.findMany({
				where: {
					userId: session.user.id,
					day: {
						gte: weightComparisonStartDay,
						lte: today,
					},
				},
				orderBy: {
					day: "asc",
				},
			}),
			prisma.weightEntry.findMany({
				where: {
					userId: session.user.id,
					day: {
						lt: today,
					},
				},
				orderBy: {
					day: "desc",
				},
				take: 90,
			}),
			prisma.fastingSession.findFirst({
				where: {
					userId: session.user.id,
					endedAt: null,
				},
				orderBy: {
					startedAt: "desc",
				},
			}),
			prisma.fastingSession.findMany({
				where: {
					userId: session.user.id,
					endedAt: {
						not: null,
					},
				},
				orderBy: {
					startedAt: "desc",
				},
				take: 5,
			}),
	]);
	const renderNow = new Date();

	const totalCaloriesToday = calorieEntries.reduce(
		(total, entry) => total + entry.calories,
		0,
	);
	const totalCaloriesTomorrow = tomorrowCalorieEntries.reduce(
		(total, entry) => total + entry.calories,
		0,
	);
	const recentDays = Array.from({ length: RECENT_DAYS }, (_, index) => {
		const day = addAppDays(recentStartDay, index);
		const previousDay = addAppDays(day, -1);
		const calories = recentCalorieEntries
			.filter((entry) => entry.day.getTime() === day.getTime())
			.reduce((total, entry) => total + entry.calories, 0);
		const weight = recentWeights.find(
			(entry) => entry.day.getTime() === day.getTime(),
		);
		const previousWeight = recentWeights.find(
			(entry) => entry.day.getTime() === previousDay.getTime(),
		);
		const weightChange =
			weight && previousWeight ? weight.weightLbs - previousWeight.weightLbs : null;

		return {
			day,
			calories,
			weight,
			weightChange,
		};
	});
	const selectedCompareWeight = compareWeightOptions.find(
		(entry) => getAppDateKey(entry.day) === selectedCompareDayKey,
	);
	const comparisonDelta =
		todayWeightEntry && selectedCompareWeight
			? todayWeightEntry.weightLbs - selectedCompareWeight.weightLbs
			: null;
	const startingWeightDelta =
		todayWeightEntry && userWeightBaseline?.startingWeightLbs
			? todayWeightEntry.weightLbs - userWeightBaseline.startingWeightLbs
			: null;

	return (
		<>
			<AppNav />

			<main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
				<section className="mx-auto max-w-4xl">
					<p className="mb-2 text-sm font-medium text-sky-400">Track</p>

					<h1 className="text-4xl font-bold tracking-tight">
						Weight, Calories & Fasting
					</h1>

					<p className="mt-3 max-w-2xl text-slate-400">
						Add calories as the day happens and save one daily weigh-in for the
						current app day. Calories can also be logged one day ahead, and
						fasts can be started from an earlier time if you forget to press
						start.
					</p>

					<div className="mt-8 grid gap-4 sm:grid-cols-4">
						<div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
							<p className="text-sm font-medium text-slate-400">
								Calories Today
							</p>
							<p className="mt-3 text-3xl font-bold text-slate-50">
								{totalCaloriesToday}
							</p>
						</div>

						<div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
							<p className="text-sm font-medium text-slate-400">
								Calories Tomorrow
							</p>
							<p className="mt-3 text-3xl font-bold text-slate-50">
								{totalCaloriesTomorrow}
							</p>
						</div>

						<div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
							<p className="text-sm font-medium text-slate-400">
								Entries Today
							</p>
							<p className="mt-3 text-3xl font-bold text-slate-50">
								{calorieEntries.length}
							</p>
						</div>

						<div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
							<p className="text-sm font-medium text-slate-400">
								Weight Today
							</p>
							<p className="mt-3 text-3xl font-bold text-slate-50">
								{todayWeightEntry
									? formatWeight(todayWeightEntry.weightLbs)
									: "Not set"}
							</p>
						</div>
					</div>

					<section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
						<div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
							<div>
								<h2 className="text-xl font-bold">Weight Comparison</h2>
								<p className="mt-2 text-sm text-slate-400">
									Choose a past weigh-in or use your starting weight to compare
									against today.
								</p>
							</div>

							<form className="flex flex-col gap-3 sm:flex-row sm:items-end">
								<div>
									<label
										htmlFor="compareDay"
										className="text-sm font-medium text-slate-300"
									>
										Compare to
									</label>
									<select
										id="compareDay"
										name="compareDay"
										defaultValue={selectedCompareDayKey ?? ""}
										className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500 sm:w-56"
									>
										<option value="">Select a day</option>
										{compareWeightOptions.map((entry) => (
											<option
												key={entry.id}
												value={getAppDateKey(entry.day)}
											>
												{formatAppDate(entry.day)} - {formatWeight(entry.weightLbs)}
											</option>
										))}
									</select>
								</div>

								<button className="rounded-xl bg-sky-500 px-5 py-3 font-semibold text-slate-950 hover:bg-sky-400">
									Compare
								</button>

								{selectedCompareDayKey && (
									<Link
										href="/nutrition"
										className="rounded-xl border border-slate-700 px-5 py-3 text-center font-semibold text-slate-200 hover:border-sky-400 hover:text-sky-200"
									>
										Clear
									</Link>
								)}
							</form>
						</div>

						<div className="mt-5 rounded-xl border border-slate-800 bg-slate-950 p-4">
							{!todayWeightEntry ? (
								<p className="text-sm text-slate-400">
									Save today&apos;s weight to compare it against a past day or
									your starting weight.
								</p>
							) : !selectedCompareDayKey ? (
								<p className="text-sm text-slate-400">
									Select a past day to see the difference from today&apos;s{" "}
									{formatWeight(todayWeightEntry.weightLbs)}.
								</p>
							) : !selectedCompareWeight ? (
								<p className="text-sm text-slate-400">
									No saved weight was found for that past day.
								</p>
							) : comparisonDelta === null ? (
								<p className="text-sm text-slate-400">
									No comparison is available yet.
								</p>
							) : (
								<div className="grid gap-3 text-sm sm:grid-cols-3">
									<div>
										<p className="text-slate-500">Today</p>
										<p className="mt-1 font-semibold text-slate-100">
											{formatWeight(todayWeightEntry.weightLbs)}
										</p>
									</div>
									<div>
										<p className="text-slate-500">
											{formatAppDate(selectedCompareWeight.day)}
										</p>
										<p className="mt-1 font-semibold text-slate-100">
											{formatWeight(selectedCompareWeight.weightLbs)}
										</p>
									</div>
									<div>
										<p className="text-slate-500">Difference</p>
										<p
											className={`mt-1 font-semibold ${getWeightDeltaTone(comparisonDelta)}`}
										>
											{formatWeightDelta(comparisonDelta)}
										</p>
									</div>
								</div>
							)}
						</div>

						<div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-4">
							<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
								<div>
									<h3 className="font-semibold text-slate-100">
										Starting weight comparison
									</h3>
									<p className="mt-1 text-sm text-slate-500">
										Use this baseline to track total change from where you
										started.
									</p>
								</div>

								{userWeightBaseline?.startingWeightLbs && (
									<span className="w-fit rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-300">
										{formatWeight(userWeightBaseline.startingWeightLbs)}
									</span>
								)}
							</div>

							{!userWeightBaseline?.startingWeightLbs ? (
								<p className="mt-4 text-sm text-slate-400">
									Set a starting weight below to compare today against it.
								</p>
							) : !todayWeightEntry ? (
								<p className="mt-4 text-sm text-slate-400">
									Save today&apos;s weight to see your change from starting
									weight.
								</p>
							) : startingWeightDelta === null ? (
								<p className="mt-4 text-sm text-slate-400">
									No starting comparison is available yet.
								</p>
							) : (
								<div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
									<div>
										<p className="text-slate-500">Today</p>
										<p className="mt-1 font-semibold text-slate-100">
											{formatWeight(todayWeightEntry.weightLbs)}
										</p>
									</div>
									<div>
										<p className="text-slate-500">Starting weight</p>
										<p className="mt-1 font-semibold text-slate-100">
											{formatWeight(userWeightBaseline.startingWeightLbs)}
										</p>
										{userWeightBaseline.startingWeightSetAt && (
											<p className="mt-1 text-xs text-slate-500">
												Set {formatAppDate(userWeightBaseline.startingWeightSetAt)}
											</p>
										)}
									</div>
									<div>
										<p className="text-slate-500">Difference</p>
										<p
											className={`mt-1 font-semibold ${getWeightDeltaTone(startingWeightDelta)}`}
										>
											{formatWeightDelta(startingWeightDelta)}
										</p>
									</div>
								</div>
							)}
						</div>
					</section>

					<FastingTimer
						activeStartedAt={activeFast?.startedAt.toISOString() ?? null}
						activeStartedLabel={
							activeFast
								? `${formatAppDate(activeFast.startedAt)} at ${formatAppTime(activeFast.startedAt)}`
								: null
						}
						defaultStartDateKey={getAppDateKey(new Date())}
						defaultStartTimeKey={getAppTimeKey(new Date())}
						initialElapsedSeconds={
							activeFast ? getFastingDurationSeconds(activeFast, renderNow) : 0
						}
						lastFastLabel={
							recentFasts[0]
								? formatFastingDuration(getFastingDurationSeconds(recentFasts[0]))
								: null
						}
					/>

					<div className="mt-8 grid gap-6 lg:grid-cols-3">
						<form
							action={addCalorieEntry}
							className="rounded-2xl border border-slate-800 bg-slate-900 p-6"
						>
							<h2 className="text-xl font-bold">Add Calories</h2>

							<div className="mt-5 space-y-4">
								<div>
									<label className="text-sm font-medium text-slate-300">
										Calories
									</label>

									<input
										type="number"
										name="calories"
										min="1"
										max="10000"
										step="1"
										placeholder="450"
										className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
									/>
								</div>

								<div>
									<label className="text-sm font-medium text-slate-300">
										Note
									</label>

									<input
										name="note"
										placeholder="Lunch, snack, protein shake"
										className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
									/>
								</div>

								<div>
									<label className="text-sm font-medium text-slate-300">
										Log for
									</label>

									<select
										name="targetDay"
										defaultValue="today"
										className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
									>
										<option value="today">Today, {formatAppDate(today)}</option>
										<option value="tomorrow">
											Tomorrow, {formatAppDate(tomorrow)}
										</option>
									</select>
								</div>

								<button className="rounded-xl bg-sky-500 px-5 py-3 font-semibold text-slate-950 hover:bg-sky-400">
									Add Calories
								</button>
							</div>
						</form>

						<form
							action={saveWeightEntry}
							className="rounded-2xl border border-slate-800 bg-slate-900 p-6"
						>
							<h2 className="text-xl font-bold">Daily Weight</h2>

							<div className="mt-5 space-y-4">
								<div>
									<label className="text-sm font-medium text-slate-300">
										Weight in pounds
									</label>

									<input
										type="number"
										name="weightLbs"
										min="1"
										max="1000"
										step="0.1"
										defaultValue={todayWeightEntry?.weightLbs ?? ""}
										placeholder="185.4"
										className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
									/>
								</div>

								<button className="rounded-xl bg-sky-500 px-5 py-3 font-semibold text-slate-950 hover:bg-sky-400">
									Save Weight
								</button>
							</div>
						</form>

						<form
							action={saveStartingWeight}
							className="rounded-2xl border border-slate-800 bg-slate-900 p-6"
						>
							<h2 className="text-xl font-bold">Starting Weight</h2>

							<p className="mt-2 text-sm text-slate-400">
								Set your baseline for total weight change.
							</p>

							<div className="mt-5 space-y-4">
								<div>
									<label className="text-sm font-medium text-slate-300">
										Starting weight in pounds
									</label>

									<input
										type="number"
										name="weightLbs"
										min="1"
										max="1000"
										step="0.1"
										defaultValue={userWeightBaseline?.startingWeightLbs ?? ""}
										placeholder="205.0"
										className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
									/>
								</div>

								<button className="rounded-xl bg-sky-500 px-5 py-3 font-semibold text-slate-950 hover:bg-sky-400">
									Save Starting Weight
								</button>
							</div>
						</form>
					</div>

					<section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
						<h2 className="text-xl font-bold">Today&apos;s Calories</h2>

						{calorieEntries.length === 0 ? (
							<p className="mt-4 text-sm text-slate-400">
								No calories logged yet today.
							</p>
						) : (
							<div className="mt-4 space-y-3">
								{calorieEntries.map((entry) => (
									<div
										key={entry.id}
										className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950 p-4 sm:flex-row sm:items-center sm:justify-between"
									>
										<div>
											<p className="text-lg font-semibold text-slate-100">
												{entry.calories} calories
											</p>
											<p className="mt-1 text-sm text-slate-500">
												{formatAppTime(entry.loggedAt)}
												{entry.note ? ` · ${entry.note}` : ""}
											</p>
										</div>

										<form action={deleteCalorieEntry.bind(null, entry.id)}>
											<button className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-200 hover:border-red-400 hover:text-red-300">
												Delete
											</button>
										</form>
									</div>
								))}
							</div>
						)}
					</section>

					{tomorrowCalorieEntries.length > 0 && (
						<section className="mt-8 rounded-2xl border border-sky-500/30 bg-sky-500/10 p-6">
							<h2 className="text-xl font-bold">
								Tomorrow&apos;s Calories
							</h2>

							<div className="mt-4 space-y-3">
								{tomorrowCalorieEntries.map((entry) => (
									<div
										key={entry.id}
										className="flex flex-col gap-3 rounded-xl border border-sky-400/20 bg-slate-950 p-4 sm:flex-row sm:items-center sm:justify-between"
									>
										<div>
											<p className="text-lg font-semibold text-slate-100">
												{entry.calories} calories
											</p>
											<p className="mt-1 text-sm text-slate-500">
												{formatAppTime(entry.loggedAt)}
												{entry.note ? ` · ${entry.note}` : ""}
											</p>
										</div>

										<form action={deleteCalorieEntry.bind(null, entry.id)}>
											<button className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-200 hover:border-red-400 hover:text-red-300">
												Delete
											</button>
										</form>
									</div>
								))}
							</div>
						</section>
					)}

					{recentFasts.length > 0 && (
						<section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
							<h2 className="text-xl font-bold">Recent Fasts</h2>

							<div className="mt-4 space-y-3">
								{recentFasts.map((fast) => (
									<div
										key={fast.id}
										className="grid gap-3 rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm sm:grid-cols-[1fr_1fr_auto] sm:items-center"
									>
										<p className="font-semibold text-slate-100">
											{formatAppDate(fast.startedAt)} at{" "}
											{formatAppTime(fast.startedAt)}
										</p>
										<p className="text-slate-400">
											Ended{" "}
											{fast.endedAt
												? `${formatAppDate(fast.endedAt)} at ${formatAppTime(fast.endedAt)}`
												: "in progress"}
										</p>
										<p className="font-semibold text-emerald-300">
											{formatFastingDuration(getFastingDurationSeconds(fast))}
										</p>
									</div>
								))}
							</div>
						</section>
					)}

					<section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
						<h2 className="text-xl font-bold">Recent Days</h2>

						<div className="mt-4 space-y-3">
							{recentDays.map((day) => (
								<div
									key={day.day.toISOString()}
									className="grid gap-3 rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm sm:grid-cols-4"
								>
									<p className="font-semibold text-slate-100">
										{formatAppDate(day.day)}
									</p>
									<p className="text-slate-300">{day.calories} calories</p>
									<p className="text-slate-400">
										{day.weight ? formatWeight(day.weight.weightLbs) : "No weight"}
									</p>
									<p
										className={
											day.weightChange === null
												? "text-slate-500"
												: getWeightDeltaTone(day.weightChange)
										}
									>
										{day.weightChange === null
											? "No prior weight"
											: formatWeightDelta(day.weightChange)}
									</p>
								</div>
							))}
						</div>
					</section>
				</section>
			</main>
		</>
	);
}
