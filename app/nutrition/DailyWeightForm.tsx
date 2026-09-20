"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { saveWeightEntry } from "@/app/actions/nutrition";
import { formatAppDate } from "@/lib/app-date";

type WeightRecord = NonNullable<Awaited<ReturnType<typeof saveWeightEntry>>>;

export default function DailyWeightForm({ userId, weightLbs }: {
	userId: string;
	weightLbs?: number;
}) {
	const storageKey = `upnext:low-weight-banner:${userId}`;
	const [enabled, setEnabled] = useState(true);
	const [ready, setReady] = useState(false);
	const [record, setRecord] = useState<WeightRecord | null>(null);
	const [pending, setPending] = useState(false);
	const [message, setMessage] = useState("");

	useEffect(() => {
		try {
			setEnabled(localStorage.getItem(storageKey) !== "off");
		} catch { /* Keep the default when browser storage is unavailable. */ }
		setReady(true);
	}, [storageKey]);

	function toggle() {
		const next = !enabled;
		setEnabled(next);
		setRecord(null);
		try {
			localStorage.setItem(storageKey, next ? "on" : "off");
		} catch { /* The toggle still works for this visit. */ }
	}

	async function save(formData: FormData) {
		setPending(true);
		setMessage("");
		setRecord(null);
		try {
			const result = await saveWeightEntry(formData);
			if (result === undefined) {
				setMessage("Enter a weight between 1 and 1,000 lb.");
			} else {
				setRecord(result ?? null);
				setMessage("Weight saved.");
			}
		} catch {
			setMessage("Could not save your weight. Please try again.");
		} finally {
			setPending(false);
		}
	}

	return (
		<>
			{ready && enabled && record && createPortal(
				<div role="status" aria-live="polite" className="fixed inset-x-0 top-0 z-[80] border-b border-emerald-400/40 bg-emerald-950 px-6 py-4 text-emerald-50 shadow-xl">
					<div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4">
						<div>
							<p className="text-lg font-bold">New low weight: {record.weightLbs.toFixed(1)} lb</p>
							<p className="mt-1 text-sm text-emerald-100">Previous low: {record.previousLow.toFixed(1)} lb · Achieved {formatAppDate(new Date(record.achievedAt))}</p>
						</div>
						<button type="button" onClick={() => setRecord(null)} className="rounded-lg border border-emerald-400/40 px-3 py-2 text-sm font-semibold hover:bg-emerald-900">Dismiss</button>
					</div>
				</div>, document.body,
			)}
			<form onSubmit={(event) => {
				event.preventDefault();
				void save(new FormData(event.currentTarget));
			}} className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
				<h2 className="text-xl font-bold">Daily Weight</h2>
				<div className="mt-5 space-y-4">
					<div>
						<label htmlFor="daily-weight" className="text-sm font-medium text-slate-300">Weight in pounds</label>
						<input id="daily-weight" type="number" name="weightLbs" min="1" max="1000" step="0.1" required defaultValue={weightLbs ?? ""} placeholder="185.4" className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500" />
					</div>
					<div className="rounded-xl border border-slate-700 p-3">
						<label className="flex items-center justify-between gap-3 text-sm font-medium text-slate-200">
							New low weight notifications
							<input type="checkbox" role="switch" checked={enabled} disabled={!ready || pending} onChange={toggle} className="h-5 w-5 accent-emerald-400" />
						</label>
						<p className="mt-2 text-xs text-slate-400">Show a banner when you beat your lowest weight. Remembered in this browser.</p>
					</div>
					<button disabled={pending || !ready} className="rounded-xl bg-sky-500 px-5 py-3 font-semibold text-slate-950 hover:bg-sky-400 disabled:opacity-50">{pending ? "Saving…" : "Save Weight"}</button>
					{message && <p role="status" className="text-sm text-slate-300">{message}</p>}
				</div>
			</form>
		</>
	);
}
