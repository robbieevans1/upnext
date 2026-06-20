import AppNav from "@/components/AppNav";
import {
	archiveTopic,
	createTopic,
	restoreTopic,
	updateTopic,
} from "@/app/actions/topics";
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

						<div className="mt-5 space-y-4">
							<TextInput
								label="Title"
								name="title"
								placeholder="Networking events"
							/>
							<TextInput
								label="Category"
								name="category"
								placeholder="Social, Career, Health"
							/>
							<TextArea
								label="Description"
								name="description"
								placeholder="Short summary or when to use this topic"
							/>
							<TextArea
								label="Notes"
								name="body"
								placeholder="Steps, reminders, current work, principles, or things to reread."
								tall
							/>

							<button className="rounded-xl bg-sky-500 px-5 py-3 font-semibold text-slate-950 hover:bg-sky-400">
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
		<div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
			<form action={updateTopic} className="space-y-4">
				<input type="hidden" name="topicId" value={topic.id} />

				<TextInput label="Title" name="title" defaultValue={topic.title} />
				<TextInput
					label="Category"
					name="category"
					defaultValue={topic.category ?? ""}
				/>
				<TextArea
					label="Description"
					name="description"
					defaultValue={topic.description ?? ""}
				/>
				<TextArea
					label="Notes"
					name="body"
					defaultValue={topic.body ?? ""}
					tall
				/>

				<div className="flex flex-wrap gap-2">
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

				<div className="flex flex-wrap gap-3">
					<button className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400">
						Save Topic
					</button>
				</div>
			</form>

			<form
				action={
					archived
						? restoreTopic.bind(null, topic.id)
						: archiveTopic.bind(null, topic.id)
				}
				className="mt-3"
			>
				<button className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-sky-500 hover:text-sky-400">
					{archived ? "Restore Topic" : "Archive Topic"}
				</button>
			</form>
		</div>
	);
}

function TextInput({
	label,
	name,
	placeholder,
	defaultValue,
}: {
	label: string;
	name: string;
	placeholder?: string;
	defaultValue?: string;
}) {
	return (
		<div>
			<label className="text-sm font-medium text-slate-300">{label}</label>
			<input
				name={name}
				placeholder={placeholder}
				defaultValue={defaultValue}
				className="mt-2 w-full min-w-0 max-w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
			/>
		</div>
	);
}

function TextArea({
	label,
	name,
	placeholder,
	defaultValue,
	tall = false,
}: {
	label: string;
	name: string;
	placeholder?: string;
	defaultValue?: string;
	tall?: boolean;
}) {
	return (
		<div>
			<label className="text-sm font-medium text-slate-300">{label}</label>
			<textarea
				name={name}
				placeholder={placeholder}
				defaultValue={defaultValue}
				className={`mt-2 w-full min-w-0 max-w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500 ${tall ? "min-h-40" : ""}`}
			/>
		</div>
	);
}
