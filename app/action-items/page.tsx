import AppNav from "@/components/AppNav";
import TaskPlaybookButton from "@/components/TaskPlaybookButton";
import {
	cancelActionItem,
	completeActionItem,
	createActionItem,
	reopenActionItem,
	updateActionItem,
} from "@/app/actions/action-items";
import { authOptions } from "@/lib/auth";
import { formatAppDate, getAppDateKey } from "@/lib/app-date";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export default async function ActionItemsPage() {
	const session = await getServerSession(authOptions);

	if (!session?.user) {
		redirect("/login");
	}

	const actionItems = await prisma.actionItem.findMany({
		where: {
			userId: session.user.id,
		},
		orderBy: [
			{
				completedAt: "asc",
			},
			{
				canceledAt: "asc",
			},
			{
				dueOn: "asc",
			},
			{
				createdAt: "desc",
			},
		],
	});

	const openItems = actionItems.filter(
		(item) => !item.completedAt && !item.canceledAt,
	);
	const closedItems = actionItems.filter(
		(item) => item.completedAt || item.canceledAt,
	);

	return (
		<>
			<AppNav />

			<main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
				<section className="mx-auto max-w-3xl">
					<p className="mb-2 text-sm font-medium text-sky-400">One-off</p>

					<h1 className="text-4xl font-bold tracking-tight">Action Items</h1>

					<p className="mt-3 text-slate-400">
						Capture errands and one-time tasks that are not part of the daily
						improvement stack.
					</p>

					<form
						action={createActionItem}
						className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6"
					>
						<h2 className="text-xl font-bold">Add Action Item</h2>

						<div className="mt-5 space-y-4">
							<TextInput label="Name" name="title" placeholder="Return package" />
							<TextArea
								label="Description"
								name="description"
								placeholder="Anything useful to remember before doing it"
							/>
							<TextArea
								label="Playbook"
								name="playbook"
								placeholder="Steps, tips, or reminders for handling this well."
								tall
							/>

							<div className="min-w-0">
								<label className="text-sm font-medium text-slate-300">
									Due date
								</label>
								<input
									type="date"
									name="dueOn"
									className="mt-2 w-full min-w-0 max-w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
								/>
							</div>

							<button className="rounded-xl bg-sky-500 px-5 py-3 font-semibold text-slate-950 hover:bg-sky-400">
								Add Action Item
							</button>
						</div>
					</form>

					<ActionItemList title="Open" items={openItems} />
					<ActionItemList title="Completed or Canceled" items={closedItems} />
				</section>
			</main>
		</>
	);
}

type ActionItem = Awaited<
	ReturnType<typeof prisma.actionItem.findMany>
>[number];

function ActionItemList({
	title,
	items,
}: {
	title: string;
	items: ActionItem[];
}) {
	return (
		<div className="mt-10">
			<h2 className="mb-4 text-xl font-bold">{title}</h2>

			{items.length === 0 ? (
				<div className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-slate-400">
					Nothing here yet.
				</div>
			) : (
				<div className="space-y-4">
					{items.map((item) => (
						<ActionItemCard key={item.id} item={item} />
					))}
				</div>
			)}
		</div>
	);
}

function ActionItemCard({ item }: { item: ActionItem }) {
	const isClosed = Boolean(item.completedAt || item.canceledAt);

	return (
		<div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
			<form action={updateActionItem} className="space-y-4">
				<input type="hidden" name="actionItemId" value={item.id} />
				<TextInput label="Name" name="title" defaultValue={item.title} />
				<TextArea
					label="Description"
					name="description"
					defaultValue={item.description ?? ""}
				/>
				<TextArea
					label="Playbook"
					name="playbook"
					defaultValue={item.playbook ?? ""}
					tall
				/>

				<div className="min-w-0">
					<label className="text-sm font-medium text-slate-300">Due date</label>
					<input
						type="date"
						name="dueOn"
						defaultValue={item.dueOn ? getAppDateKey(item.dueOn) : ""}
						className="mt-2 w-full min-w-0 max-w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
					/>
				</div>

				<div className="flex flex-wrap gap-2">
					{item.dueOn && (
						<span className="rounded-full bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-400">
							Due {formatAppDate(item.dueOn)}
						</span>
					)}
					{item.completedAt && (
						<span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
							Completed
						</span>
					)}
					{item.canceledAt && (
						<span className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-medium text-red-300">
							Canceled
						</span>
					)}
				</div>

				<div className="flex flex-wrap gap-3">
					<button className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400">
						Save
					</button>
					<TaskPlaybookButton taskTitle={item.title} playbook={item.playbook} />
				</div>
			</form>

			<div className="mt-3 flex flex-wrap gap-3">
				{isClosed ? (
					<form action={reopenActionItem.bind(null, item.id)}>
						<button className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-sky-500 hover:text-sky-400">
							Reopen
						</button>
					</form>
				) : (
					<>
						<form action={completeActionItem.bind(null, item.id)}>
							<button className="rounded-lg border border-emerald-500/40 px-4 py-2 text-sm text-emerald-200 hover:bg-emerald-500/10">
								Complete
							</button>
						</form>
						<form action={cancelActionItem.bind(null, item.id)}>
							<button className="rounded-lg border border-red-500/40 px-4 py-2 text-sm text-red-300 hover:bg-red-500/10">
								Cancel
							</button>
						</form>
					</>
				)}
			</div>
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
				className={`mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500 ${tall ? "min-h-32" : ""}`}
			/>
		</div>
	);
}
