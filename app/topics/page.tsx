import AppNav from "@/components/AppNav";
import Link from "next/link";
import { TopicFormFields } from "@/components/TopicFormFields";
import { createTopic } from "@/app/actions/topics";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export default async function TopicsPage() {
	const session = await getServerSession(authOptions);

	if (!session?.user?.id) {
		redirect("/login");
	}

	const topics = await prisma.topic.findMany({
		where: {
			userId: session.user.id,
		},
		orderBy: [
			{
				isArchived: "asc",
			},
			{
				updatedAt: "desc",
			},
		],
	});

	const activeTopics = topics.filter((topic) => !topic.isArchived);
	const archivedTopics = topics.filter((topic) => topic.isArchived);

	return (
		<>
			<AppNav />

			<main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
				<section className="mx-auto max-w-4xl">
					<p className="mb-2 text-sm font-medium text-sky-400">Reference</p>

					<h1 className="text-4xl font-bold tracking-tight">Topics</h1>

					<p className="mt-3 max-w-2xl text-slate-400">
						Keep reusable notes, reminders, steps, and current focus areas
						without attaching them to a specific task.
					</p>

					<form
						action={createTopic}
						className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6"
					>
						<h2 className="text-xl font-bold">Add Topic</h2>

						<div className="mt-5">
							<TopicFormFields />

							<button className="mt-5 rounded-xl bg-sky-500 px-5 py-3 font-semibold text-slate-950 hover:bg-sky-400">
								Add Topic
							</button>
						</div>
					</form>

					<TopicList title="Active Topics" topics={activeTopics} />
					<TopicList title="Archived Topics" topics={archivedTopics} archived />
				</section>
			</main>
		</>
	);
}

type Topic = Awaited<ReturnType<typeof prisma.topic.findMany>>[number];

function TopicList({
	title,
	topics,
	archived = false,
}: {
	title: string;
	topics: Topic[];
	archived?: boolean;
}) {
	return (
		<div className="mt-10">
			<h2 className="mb-4 text-xl font-bold">{title}</h2>

			{topics.length === 0 ? (
				<div className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-slate-400">
					Nothing here yet.
				</div>
			) : (
				<div className="space-y-4">
					{topics.map((topic) => (
						<TopicCard key={topic.id} topic={topic} archived={archived} />
					))}
				</div>
			)}
		</div>
	);
}

function TopicCard({ topic, archived }: { topic: Topic; archived: boolean }) {
	return (
		<Link
			href={`/topics/${topic.id}`}
			className="block rounded-xl border border-slate-800 bg-slate-900 p-4 transition hover:border-sky-500/70 hover:bg-slate-900/80"
		>
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div className="min-w-0">
					<h3 className="break-words text-lg font-semibold text-white">
						{topic.title}
					</h3>
					{topic.description && (
						<p className="mt-1 line-clamp-2 text-sm text-slate-400">
							{topic.description}
						</p>
					)}
				</div>

				<div className="flex shrink-0 flex-wrap gap-2">
					{topic.category && (
						<span className="rounded-full bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-400">
							{topic.category}
						</span>
					)}
					{archived && (
						<span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-300">
							Archived
						</span>
					)}
				</div>
			</div>
		</Link>
	);
}
