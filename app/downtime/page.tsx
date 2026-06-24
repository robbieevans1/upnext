import AppNav from "@/components/AppNav";
import DowntimeTimer from "@/app/downtime/DowntimeTimer";
import { getAppTodayDate, getNextAppMidnightDate } from "@/lib/app-date";
import { authOptions } from "@/lib/auth";
import { DOWNTIME_CATEGORIES } from "@/lib/downtime";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { connection } from "next/server";

function getStoppedDurationSeconds(session: {
	startedAt: Date;
	stoppedAt: Date | null;
}) {
	if (!session.stoppedAt) {
		return 0;
	}

	return Math.max(
		0,
		Math.floor(
			(session.stoppedAt.getTime() - session.startedAt.getTime()) / 1000,
		),
	);
}

export default async function DowntimePage() {
	await connection();

	const session = await getServerSession(authOptions);

	if (!session?.user?.id) {
		redirect("/login");
	}

	const now = new Date();
	const today = getAppTodayDate(now);
	const tomorrow = getNextAppMidnightDate(now);

	const downtimeSessions = await prisma.downtimeSession.findMany({
		where: {
			userId: session.user.id,
			day: today,
			startedAt: {
				lt: tomorrow,
			},
		},
		orderBy: {
			startedAt: "asc",
		},
	});
	const activeTaskSession = await prisma.taskSession.findFirst({
		where: {
			userId: session.user.id,
			stoppedAt: null,
		},
		include: {
			task: {
				select: {
					title: true,
				},
			},
		},
		orderBy: {
			startedAt: "desc",
		},
	});

	const activeSession = downtimeSessions.find(
		(downtimeSession) => downtimeSession.stoppedAt === null,
	);
	const totalSecondsToday = downtimeSessions.reduce(
		(total, downtimeSession) =>
			total + getStoppedDurationSeconds(downtimeSession),
		0,
	);
	const categoryTotals = DOWNTIME_CATEGORIES.map((category) => ({
		category,
		totalSeconds: downtimeSessions
			.filter((downtimeSession) => downtimeSession.category === category)
			.reduce(
				(total, downtimeSession) =>
					total + getStoppedDurationSeconds(downtimeSession),
				0,
			),
	}));

	return (
		<>
			<AppNav />

			<main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
				<section className="mx-auto max-w-3xl">
					<p className="mb-2 text-sm font-medium text-sky-400">
						Time Available
					</p>

					<h1 className="text-4xl font-bold tracking-tight">
						Life Time Tracker
					</h1>

					<p className="mt-3 max-w-2xl text-slate-400">
						Track time spent away from improvement activities so each day shows
						how much flexible time went to sleep, social plans, meals, or other
						life needs.
					</p>

					<DowntimeTimer
						activeSession={
							activeSession
								? {
										category: activeSession.category,
										startedAt: activeSession.startedAt.toISOString(),
									}
								: null
						}
						activeTaskSession={
							activeTaskSession
								? {
										taskTitle: activeTaskSession.task.title,
										startedAt: activeTaskSession.startedAt.toISOString(),
									}
								: null
						}
						categoryTotals={categoryTotals}
						initialActiveElapsedSeconds={
							activeSession
								? Math.max(
										0,
										Math.floor(
											(now.getTime() - activeSession.startedAt.getTime()) /
												1000,
										),
									)
								: 0
						}
						initialActiveTaskElapsedSeconds={
							activeTaskSession
								? Math.max(
										0,
										Math.floor(
											(now.getTime() -
												activeTaskSession.startedAt.getTime()) /
												1000,
										),
									)
								: 0
						}
						totalSecondsToday={totalSecondsToday}
					/>
				</section>
			</main>
		</>
	);
}
