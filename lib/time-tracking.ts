import {
	getAppTodayDate,
	getNextAppMidnightDate,
} from "@/lib/app-date";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

const DEFAULT_DOWNTIME_CATEGORY = "Other";

type PrismaOperation = Prisma.PrismaPromise<unknown>;

function getTaskSessionCreateOperation({
	userId,
	taskId,
	startedAt,
}: {
	userId: string;
	taskId: string;
	startedAt: Date;
}) {
	return prisma.taskSession.create({
		data: {
			userId,
			taskId,
			day: getAppTodayDate(startedAt),
			startedAt,
		},
	});
}

function getDowntimeCreateOperation({
	userId,
	category,
	startedAt,
}: {
	userId: string;
	category: string;
	startedAt: Date;
}) {
	return prisma.downtimeSession.create({
		data: {
			userId,
			category,
			day: getAppTodayDate(startedAt),
			startedAt,
		},
	});
}

export async function rolloverActiveDowntimeSession(
	userId: string,
	now = new Date(),
) {
	const activeSession = await prisma.downtimeSession.findFirst({
		where: {
			userId,
			stoppedAt: null,
		},
		orderBy: {
			startedAt: "desc",
		},
	});

	if (!activeSession) {
		return false;
	}

	const today = getAppTodayDate(now);

	if (activeSession.startedAt.getTime() >= today.getTime()) {
		return false;
	}

	const operations: PrismaOperation[] = [];
	let nextBoundary = getNextAppMidnightDate(activeSession.startedAt);

	operations.push(
		prisma.downtimeSession.update({
			where: {
				id: activeSession.id,
			},
			data: {
				stoppedAt: nextBoundary,
			},
		}),
	);

	while (nextBoundary.getTime() < today.getTime()) {
		const segmentStart = nextBoundary;
		const segmentEnd = getNextAppMidnightDate(segmentStart);

		operations.push(
			prisma.downtimeSession.create({
				data: {
					userId,
					category: activeSession.category,
					day: segmentStart,
					startedAt: segmentStart,
					stoppedAt: segmentEnd,
				},
			}),
		);

		nextBoundary = segmentEnd;
	}

	operations.push(
		getDowntimeCreateOperation({
			userId,
			category: activeSession.category,
			startedAt: today,
		}),
	);

	await prisma.$transaction(operations);

	return true;
}

export async function rolloverActiveTaskSession(
	userId: string,
	now = new Date(),
) {
	const activeSession = await prisma.taskSession.findFirst({
		where: {
			userId,
			stoppedAt: null,
		},
		orderBy: {
			startedAt: "desc",
		},
	});

	if (!activeSession) {
		return false;
	}

	const today = getAppTodayDate(now);

	if (activeSession.startedAt.getTime() >= today.getTime()) {
		return false;
	}

	const operations: PrismaOperation[] = [];
	let nextBoundary = getNextAppMidnightDate(activeSession.startedAt);

	operations.push(
		prisma.taskSession.update({
			where: {
				id: activeSession.id,
			},
			data: {
				stoppedAt: nextBoundary,
			},
		}),
	);

	while (nextBoundary.getTime() < today.getTime()) {
		const segmentStart = nextBoundary;
		const segmentEnd = getNextAppMidnightDate(segmentStart);

		operations.push(
			prisma.taskSession.create({
				data: {
					userId,
					taskId: activeSession.taskId,
					day: segmentStart,
					startedAt: segmentStart,
					stoppedAt: segmentEnd,
				},
			}),
		);

		nextBoundary = segmentEnd;
	}

	operations.push(
		getTaskSessionCreateOperation({
			userId,
			taskId: activeSession.taskId,
			startedAt: today,
		}),
	);

	await prisma.$transaction(operations);

	return true;
}

export async function startTaskSession(userId: string, taskId: string) {
	const now = new Date();
	await rolloverActiveTaskSession(userId, now);
	await rolloverActiveDowntimeSession(userId, now);

	const task = await prisma.task.findFirst({
		where: {
			id: taskId,
			userId,
			isActive: true,
		},
	});

	if (!task) {
		return null;
	}

	const activeTaskSession = await prisma.taskSession.findFirst({
		where: {
			userId,
			stoppedAt: null,
		},
		orderBy: {
			startedAt: "desc",
		},
	});

	if (activeTaskSession) {
		if (activeTaskSession.taskId === taskId) {
			return activeTaskSession;
		}

		await prisma.taskSession.update({
			where: {
				id: activeTaskSession.id,
			},
			data: {
				stoppedAt: now,
			},
		});
	}

	const activeDowntimeSession = await prisma.downtimeSession.findFirst({
		where: {
			userId,
			stoppedAt: null,
		},
		orderBy: {
			startedAt: "desc",
		},
	});

	const operations: PrismaOperation[] = [];

	if (activeDowntimeSession) {
		operations.push(
			prisma.downtimeSession.update({
				where: {
					id: activeDowntimeSession.id,
				},
				data: {
					stoppedAt: now,
				},
			}),
		);
	}

	operations.push(
		getTaskSessionCreateOperation({
			userId,
			taskId,
			startedAt: now,
		}),
	);

	const [createdSession] = await prisma.$transaction(operations.reverse());

	return createdSession;
}

export async function stopActiveTaskSessionAndStartOther(
	userId: string,
	taskId?: string,
) {
	const now = new Date();
	await rolloverActiveTaskSession(userId, now);

	const activeTaskSession = await prisma.taskSession.findFirst({
		where: {
			userId,
			...(taskId
				? {
						taskId,
					}
				: {}),
			stoppedAt: null,
		},
		orderBy: {
			startedAt: "desc",
		},
	});

	if (!activeTaskSession) {
		await ensureDefaultDowntimeSession(userId, now);
		return null;
	}

	await prisma.$transaction([
		prisma.taskSession.update({
			where: {
				id: activeTaskSession.id,
			},
			data: {
				stoppedAt: now,
			},
		}),
		getDowntimeCreateOperation({
			userId,
			category: DEFAULT_DOWNTIME_CATEGORY,
			startedAt: now,
		}),
	]);

	return activeTaskSession;
}

export async function ensureDefaultDowntimeSession(userId: string, now = new Date()) {
	await rolloverActiveTaskSession(userId, now);
	await rolloverActiveDowntimeSession(userId, now);

	const activeTaskSession = await prisma.taskSession.findFirst({
		where: {
			userId,
			stoppedAt: null,
		},
	});

	if (activeTaskSession) {
		return null;
	}

	const activeDowntimeSession = await prisma.downtimeSession.findFirst({
		where: {
			userId,
			stoppedAt: null,
		},
		orderBy: {
			startedAt: "desc",
		},
	});

	if (activeDowntimeSession) {
		return activeDowntimeSession;
	}

	return prisma.downtimeSession.create({
		data: {
			userId,
			category: DEFAULT_DOWNTIME_CATEGORY,
			day: getAppTodayDate(now),
			startedAt: now,
		},
	});
}

export async function switchDowntimeSession(userId: string, category: string) {
	const now = new Date();
	await rolloverActiveTaskSession(userId, now);
	await rolloverActiveDowntimeSession(userId, now);

	const activeTaskSession = await prisma.taskSession.findFirst({
		where: {
			userId,
			stoppedAt: null,
		},
	});

	if (activeTaskSession) {
		return null;
	}

	const activeDowntimeSession = await prisma.downtimeSession.findFirst({
		where: {
			userId,
			stoppedAt: null,
		},
		orderBy: {
			startedAt: "desc",
		},
	});

	if (activeDowntimeSession?.category === category) {
		return activeDowntimeSession;
	}

	const operations: PrismaOperation[] = [];

	if (activeDowntimeSession) {
		operations.push(
			prisma.downtimeSession.update({
				where: {
					id: activeDowntimeSession.id,
				},
				data: {
					stoppedAt: now,
				},
			}),
		);
	}

	operations.push(
		getDowntimeCreateOperation({
			userId,
			category,
			startedAt: now,
		}),
	);

	await prisma.$transaction(operations);

	return true;
}
