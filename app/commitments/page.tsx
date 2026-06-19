import AppNav from "@/components/AppNav";
import TaskPlaybookButton from "@/components/TaskPlaybookButton";
import {
	cancelCommitment,
	completeCommitment,
	createCommitment,
	reopenCommitment,
	updateCommitment,
} from "@/app/actions/commitments";
import { authOptions } from "@/lib/auth";
import {
	formatAppDate,
	formatAppTime,
	getAppDateKey,
	getAppTimeKey,
} from "@/lib/app-date";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export default async function CommitmentsPage() {
	const session = await getServerSession(authOptions);

	if (!session?.user) {
		redirect("/login");
	}

	const commitments = await prisma.commitment.findMany({
		where: {
			userId: session.user.id,
		},
		orderBy: [
			{
				day: "asc",
			},
			{
				startsAt: "asc",
			},
			{
				createdAt: "desc",
			},
		],
	});

	const openCommitments = commitments.filter(
		(commitment) => !commitment.completedAt && !commitment.canceledAt,
	);
	const closedCommitments = commitments.filter(
		(commitment) => commitment.completedAt || commitment.canceledAt,
	);

	return (
		<>
			<AppNav />

			<main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
				<section className="mx-auto max-w-3xl">
					<p className="mb-2 text-sm font-medium text-sky-400">Scheduled</p>

					<h1 className="text-4xl font-bold tracking-tight">Commitments</h1>

					<p className="mt-3 text-slate-400">
						Track events, errands, appointments, and obligations that belong on
						a date or time.
					</p>

					<form
						action={createCommitment}
						className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6"
					>
						<h2 className="text-xl font-bold">Add Commitment</h2>

						<div className="mt-5 space-y-4">
							<TextInput
								label="Name"
								name="title"
								placeholder="Dentist appointment"
							/>
							<TextInput
								label="Location"
								name="location"
								placeholder="Office, store, address, or link"
							/>
							<TextArea
								label="Description"
								name="description"
								placeholder="Context, prep, or what needs to happen"
							/>
							<TextArea
								label="Playbook"
								name="playbook"
								placeholder="Reminders, best practices, or how to show up well."
								tall
							/>

							<DateTimeFields />

							<button className="rounded-xl bg-sky-500 px-5 py-3 font-semibold text-slate-950 hover:bg-sky-400">
								Add Commitment
							</button>
						</div>
					</form>

					<CommitmentList title="Upcoming" commitments={openCommitments} />
					<CommitmentList
						title="Completed or Canceled"
						commitments={closedCommitments}
					/>
				</section>
			</main>
		</>
	);
}

type Commitment = Awaited<
	ReturnType<typeof prisma.commitment.findMany>
>[number];

function CommitmentList({
	title,
	commitments,
}: {
	title: string;
	commitments: Commitment[];
}) {
	return (
		<div className="mt-10">
			<h2 className="mb-4 text-xl font-bold">{title}</h2>

			{commitments.length === 0 ? (
				<div className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-slate-400">
					Nothing here yet.
				</div>
			) : (
				<div className="space-y-4">
					{commitments.map((commitment) => (
						<CommitmentCard key={commitment.id} commitment={commitment} />
					))}
				</div>
			)}
		</div>
	);
}

function CommitmentCard({ commitment }: { commitment: Commitment }) {
	const isClosed = Boolean(commitment.completedAt || commitment.canceledAt);

	return (
		<div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
			<form action={updateCommitment} className="space-y-4">
				<input type="hidden" name="commitmentId" value={commitment.id} />
				<TextInput label="Name" name="title" defaultValue={commitment.title} />
				<TextInput
					label="Location"
					name="location"
					defaultValue={commitment.location ?? ""}
				/>
				<TextArea
					label="Description"
					name="description"
					defaultValue={commitment.description ?? ""}
				/>
				<TextArea
					label="Playbook"
					name="playbook"
					defaultValue={commitment.playbook ?? ""}
					tall
				/>

				<DateTimeFields
					day={commitment.day}
					startsAt={commitment.startsAt}
					endsAt={commitment.endsAt}
				/>

				<div className="flex flex-wrap gap-2">
					<span className="rounded-full bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-400">
						{formatCommitmentWindow(commitment)}
					</span>
					{commitment.completedAt && (
						<span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
							Completed
						</span>
					)}
					{commitment.canceledAt && (
						<span className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-medium text-red-300">
							Canceled
						</span>
					)}
				</div>

				<div className="flex flex-wrap gap-3">
					<button className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400">
						Save
					</button>
					<TaskPlaybookButton
						taskTitle={commitment.title}
						playbook={commitment.playbook}
					/>
				</div>
			</form>

			<div className="mt-3 flex flex-wrap gap-3">
				{isClosed ? (
					<form action={reopenCommitment.bind(null, commitment.id)}>
						<button className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-sky-500 hover:text-sky-400">
							Reopen
						</button>
					</form>
				) : (
					<>
						<form action={completeCommitment.bind(null, commitment.id)}>
							<button className="rounded-lg border border-emerald-500/40 px-4 py-2 text-sm text-emerald-200 hover:bg-emerald-500/10">
								Complete
							</button>
						</form>
						<form action={cancelCommitment.bind(null, commitment.id)}>
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

function DateTimeFields({
	day,
	startsAt,
	endsAt,
}: {
	day?: Date;
	startsAt?: Date | null;
	endsAt?: Date | null;
}) {
	return (
		<div className="grid gap-4 md:grid-cols-3">
			<div>
				<label className="text-sm font-medium text-slate-300">Date</label>
				<input
					type="date"
					name="day"
					required
					defaultValue={day ? getAppDateKey(day) : getAppDateKey()}
					className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
				/>
			</div>
			<div>
				<label className="text-sm font-medium text-slate-300">Start</label>
				<input
					type="time"
					name="startTime"
					defaultValue={startsAt ? getAppTimeKey(startsAt) : ""}
					className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
				/>
			</div>
			<div>
				<label className="text-sm font-medium text-slate-300">End</label>
				<input
					type="time"
					name="endTime"
					defaultValue={endsAt ? getAppTimeKey(endsAt) : ""}
					className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
				/>
			</div>
		</div>
	);
}

function formatCommitmentWindow(commitment: Commitment) {
	const date = formatAppDate(commitment.day);

	if (commitment.startsAt && commitment.endsAt) {
		return `${date} · ${formatAppTime(commitment.startsAt)}-${formatAppTime(commitment.endsAt)}`;
	}

	if (commitment.startsAt) {
		return `${date} · ${formatAppTime(commitment.startsAt)}`;
	}

	return date;
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
				className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
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
