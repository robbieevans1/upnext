import AppNav from "@/components/AppNav";
import {
	createAnnouncement,
	deleteAnnouncement,
	updateAnnouncement,
} from "@/app/actions/announcements";
import {
	formatAppDate,
	formatAppTime,
	getAppDateKey,
	getAppTimeKey,
} from "@/lib/app-date";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { connection } from "next/server";

export default async function AnnouncementsPage() {
	await connection();

	const session = await getServerSession(authOptions);

	if (!session?.user?.id) {
		redirect("/login");
	}

	const now = new Date();
	const announcements = await prisma.announcement.findMany({
		where: {
			userId: session.user.id,
			isActive: true,
			targetAt: {
				gt: now,
			},
		},
		orderBy: {
			targetAt: "asc",
		},
	});

	return (
		<>
			<AppNav />

			<main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
				<section className="mx-auto max-w-3xl">
					<p className="mb-2 text-sm font-medium text-sky-400">Tools</p>

					<h1 className="text-4xl font-bold tracking-tight">
						Announcement Banner
					</h1>

					<p className="mt-3 max-w-2xl text-slate-400">
						Add a future event that appears as a banner across the app with a
						live countdown.
					</p>

					<form
						action={createAnnouncement}
						className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6"
					>
						<h2 className="text-xl font-bold">Add Announcement</h2>

						<div className="mt-5 space-y-4">
							<div>
								<label className="text-sm font-medium text-slate-300">
									Event title
								</label>

								<input
									name="title"
									placeholder="Vacation, race day, launch, appointment"
									className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
								/>
							</div>

							<div className="grid gap-4 sm:grid-cols-2">
								<div>
									<label className="text-sm font-medium text-slate-300">
										Event date
									</label>

									<input
										type="date"
										name="targetDate"
										className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
									/>
								</div>

								<div>
									<label className="text-sm font-medium text-slate-300">
										Event time
									</label>

									<input
										type="time"
										name="targetTime"
										defaultValue="09:00"
										className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
									/>
								</div>
							</div>

							<button className="rounded-xl bg-sky-500 px-5 py-3 font-semibold text-slate-950 hover:bg-sky-400">
								Add Announcement
							</button>
						</div>
					</form>

					<section className="mt-8">
						<h2 className="mb-4 text-xl font-bold">Upcoming Announcements</h2>

						{announcements.length === 0 ? (
							<div className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-slate-400">
								No future announcements yet.
							</div>
						) : (
							<div className="space-y-4">
								{announcements.map((announcement) => (
									<div
										key={announcement.id}
										className="rounded-xl border border-slate-800 bg-slate-900 p-4"
									>
										<form action={updateAnnouncement} className="space-y-4">
											<input
												type="hidden"
												name="announcementId"
												value={announcement.id}
											/>

											<div>
												<label className="text-sm font-medium text-slate-300">
													Event title
												</label>

												<input
													name="title"
													defaultValue={announcement.title}
													className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
												/>
											</div>

											<div className="grid gap-4 sm:grid-cols-2">
												<div>
													<label className="text-sm font-medium text-slate-300">
														Event date
													</label>

													<input
														type="date"
														name="targetDate"
														defaultValue={getAppDateKey(announcement.targetAt)}
														className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
													/>
												</div>

												<div>
													<label className="text-sm font-medium text-slate-300">
														Event time
													</label>

													<input
														type="time"
														name="targetTime"
														defaultValue={getAppTimeKey(announcement.targetAt)}
														className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
													/>
												</div>
											</div>

											<p className="text-sm text-slate-500">
												Currently set for {formatAppDate(announcement.targetAt)}{" "}
												at {formatAppTime(announcement.targetAt)}.
											</p>

											<button className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400">
												Save Announcement
											</button>
										</form>

										<form
											action={deleteAnnouncement.bind(null, announcement.id)}
											className="mt-3"
										>
											<button className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-red-400 hover:text-red-300">
												Archive Announcement
											</button>
										</form>
									</div>
								))}
							</div>
						)}
					</section>
				</section>
			</main>
		</>
	);
}
