import AppNav from "@/components/AppNav";
import TopicImageUploader from "@/components/TopicImageUploader";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
	archiveTopic,
	deleteTopicImage,
	restoreTopic,
	updateTopic,
	updateTopicImage,
} from "@/app/actions/topics";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";

export default async function TopicDetailPage({
	params,
}: {
	params: Promise<{ topicId: string }>;
}) {
	const session = await getServerSession(authOptions);

	if (!session?.user?.id) {
		redirect("/login");
	}

	const { topicId } = await params;
	const topic = await prisma.topic.findFirst({
		where: {
			id: topicId,
			userId: session.user.id,
		},
		include: {
			images: {
				orderBy: [
					{
						sortOrder: "asc",
					},
					{
						createdAt: "asc",
					},
				],
			},
		},
	});

	if (!topic) {
		notFound();
	}

	return (
		<>
			<AppNav />

			<main className="min-h-screen bg-slate-950 px-5 py-8 text-white sm:px-8">
				<section className="mx-auto max-w-6xl">
					<div className="flex flex-col gap-4 border-b border-slate-800 pb-5 sm:flex-row sm:items-center sm:justify-between">
						<Link
							href="/topics"
							className="text-sm font-medium text-sky-400 hover:text-sky-300"
						>
							Back to Topics
						</Link>

						<div className="flex flex-wrap gap-3">
							<form
								action={
									topic.isArchived
										? restoreTopic.bind(null, topic.id)
										: archiveTopic.bind(null, topic.id)
								}
							>
								<button className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-sky-500 hover:text-sky-400">
									{topic.isArchived ? "Restore Topic" : "Archive Topic"}
								</button>
							</form>
						</div>
					</div>

					<form action={updateTopic} className="mx-auto max-w-4xl py-10">
						<input type="hidden" name="topicId" value={topic.id} />

						<label className="sr-only" htmlFor="topic-title">
							Title
						</label>
						<input
							id="topic-title"
							name="title"
							defaultValue={topic.title}
							placeholder="Untitled"
							className="w-full min-w-0 border-none bg-transparent text-5xl font-bold tracking-tight text-white outline-none placeholder:text-slate-600"
						/>

						<div className="mt-8 grid gap-4 border-y border-slate-800 py-5 sm:grid-cols-[9rem_minmax(0,1fr)] sm:items-center">
							<label
								htmlFor="topic-category"
								className="text-sm font-medium text-slate-500"
							>
								Category
							</label>
							<input
								id="topic-category"
								name="category"
								defaultValue={topic.category ?? ""}
								placeholder="No category"
								className="w-full min-w-0 border-none bg-transparent text-slate-200 outline-none placeholder:text-slate-600"
							/>

							<label
								htmlFor="topic-description"
								className="text-sm font-medium text-slate-500"
							>
								Description
							</label>
							<textarea
								id="topic-description"
								name="description"
								defaultValue={topic.description ?? ""}
								placeholder="Short summary or when to use this topic"
								className="min-h-20 w-full min-w-0 resize-y border-none bg-transparent text-slate-300 outline-none placeholder:text-slate-600"
							/>

							{topic.isArchived && (
								<>
									<span className="text-sm font-medium text-slate-500">
										Status
									</span>
									<span className="w-fit rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-300">
										Archived
									</span>
								</>
							)}
						</div>

						<label
							htmlFor="topic-notes"
							className="mt-8 block text-sm font-medium text-slate-500"
						>
							Notes
						</label>
						<textarea
							id="topic-notes"
							name="body"
							defaultValue={topic.body ?? ""}
							placeholder="Start writing..."
							className="mt-3 min-h-[68vh] w-full min-w-0 resize-y border-none bg-transparent text-lg leading-8 text-slate-100 outline-none placeholder:text-slate-600"
						/>

						<div className="sticky bottom-0 mt-8 flex justify-end border-t border-slate-800 bg-slate-950/95 py-4">
							<button className="rounded-xl bg-sky-500 px-5 py-3 font-semibold text-slate-950 hover:bg-sky-400">
								Save Topic
							</button>
						</div>
					</form>

					<section className="mx-auto max-w-5xl pb-12">
						<TopicImageUploader topicId={topic.id} />

						{topic.images.length === 0 ? (
							<div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-400">
								No images yet.
							</div>
						) : (
							<div className="mt-6 columns-1 gap-4 sm:columns-2 lg:columns-3">
								{topic.images.map((image) => (
									<article
										key={image.id}
										className="mb-4 break-inside-avoid overflow-hidden rounded-2xl border border-slate-800 bg-slate-900"
									>
										{/* eslint-disable-next-line @next/next/no-img-element -- Topic images come from user uploads with arbitrary external Blob URLs and unknown dimensions. */}
										<img
											src={image.url}
											alt={image.altText || image.caption || topic.title}
											className="w-full bg-slate-950 object-cover"
											loading="lazy"
										/>

										<div className="space-y-3 p-4">
											<form action={updateTopicImage} className="space-y-3">
												<input
													type="hidden"
													name="imageId"
													value={image.id}
												/>

												<label className="block text-sm font-medium text-slate-400">
													Caption
													<input
														name="caption"
														defaultValue={image.caption ?? ""}
														placeholder="Optional caption"
														className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400"
													/>
												</label>

												<label className="block text-sm font-medium text-slate-400">
													Alt text
													<input
														name="altText"
														defaultValue={image.altText ?? ""}
														placeholder="Describe the image"
														className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400"
													/>
												</label>

												<div className="flex flex-wrap gap-2">
													<button className="rounded-xl border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-200 hover:border-sky-400 hover:text-sky-300">
														Save Image
													</button>
												</div>
											</form>

											<form action={deleteTopicImage.bind(null, image.id)}>
												<button className="rounded-xl border border-red-500/40 px-3 py-2 text-sm font-semibold text-red-200 hover:bg-red-500/10">
													Delete Image
												</button>
											</form>
										</div>
									</article>
								))}
							</div>
						)}
					</section>
				</section>
			</main>
		</>
	);
}
