"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type DeleteConfirmationFormProps = {
	confirmAction: () => Promise<void>;
	triggerLabel: string;
	itemLabel: string;
	confirmLabel?: string;
};

export default function DeleteConfirmationForm({
	confirmAction,
	triggerLabel,
	itemLabel,
	confirmLabel = "Delete",
}: DeleteConfirmationFormProps) {
	const router = useRouter();
	const [isOpen, setIsOpen] = useState(false);
	const [isPending, startTransition] = useTransition();

	function handleConfirm() {
		startTransition(async () => {
			await confirmAction();
			setIsOpen(false);
			router.refresh();
		});
	}

	return (
		<>
			<button
				type="button"
				onClick={() => setIsOpen(true)}
				className="rounded-lg border border-red-500/40 px-4 py-2 text-sm text-red-300 hover:bg-red-500/10"
			>
				{triggerLabel}
			</button>

			{isOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-8">
					<div
						role="dialog"
						aria-modal="true"
						aria-labelledby="delete-confirmation-title"
						className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-950 p-6 shadow-2xl"
					>
						<h2
							id="delete-confirmation-title"
							className="text-xl font-bold text-white"
						>
							Confirm Deletion
						</h2>

						<p className="mt-3 text-sm text-slate-300">
							Delete {itemLabel}? This will remove it from the active Tasks page.
						</p>

						<div className="mt-6 flex flex-wrap justify-end gap-3">
							<button
								type="button"
								onClick={() => setIsOpen(false)}
								disabled={isPending}
								className="rounded-xl border border-slate-700 px-4 py-2 font-semibold text-slate-200 hover:border-sky-500 hover:text-sky-300 disabled:cursor-not-allowed disabled:opacity-60"
							>
								Cancel
							</button>

							<form action={handleConfirm}>
								<button
									disabled={isPending}
									className="rounded-xl bg-red-500 px-4 py-2 font-semibold text-white hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-60"
								>
									{confirmLabel}
								</button>
							</form>
						</div>
					</div>
				</div>
			)}
		</>
	);
}
