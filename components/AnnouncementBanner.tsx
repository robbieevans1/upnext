import AnnouncementCountdown from "@/components/AnnouncementCountdown";
import { authOptions } from "@/lib/auth";
import { formatAppDate, formatAppTime } from "@/lib/app-date";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { connection } from "next/server";

export default async function AnnouncementBanner() {
	await connection();

	const session = await getServerSession(authOptions);

	if (!session?.user?.id) {
		return null;
	}

	const announcement = await prisma.announcement.findFirst({
		where: {
			userId: session.user.id,
			isActive: true,
			targetAt: {
				gt: new Date(),
			},
		},
		orderBy: {
			targetAt: "asc",
		},
	});

	if (!announcement) {
		return null;
	}

	return (
		<div className="border-b border-sky-500/30 bg-sky-500/10 px-4 py-3 text-white sm:px-6">
			<div className="mx-auto flex max-w-5xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
				<div className="min-w-0">
					<p className="text-xs font-semibold uppercase tracking-wide text-sky-300">
						Upcoming
					</p>
					<p className="mt-1 break-words text-sm font-semibold text-slate-100">
						{announcement.title}
					</p>
				</div>

				<div className="shrink-0 rounded-xl border border-sky-400/30 bg-slate-950 px-4 py-2 text-sm text-sky-100">
					<span className="font-semibold">
						<AnnouncementCountdown
							targetAt={announcement.targetAt.toISOString()}
						/>
					</span>
					<span className="ml-2 text-slate-400">
						until {formatAppDate(announcement.targetAt)}{" "}
						{formatAppTime(announcement.targetAt)}
					</span>
				</div>
			</div>
		</div>
	);
}
