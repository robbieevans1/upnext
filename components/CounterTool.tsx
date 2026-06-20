"use client";

import { useState } from "react";

export default function CounterTool() {
	const [count, setCount] = useState(0);

	return (
		<section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
			<p className="text-sm font-semibold uppercase tracking-wide text-sky-400">
				Quick count
			</p>
			<div
				aria-live="polite"
				data-testid="counter-value"
				className="mt-4 font-mono text-6xl font-bold tabular-nums text-white sm:text-7xl"
			>
				{count}
			</div>

			<div className="mt-6 flex flex-wrap gap-3">
				<button
					type="button"
					onClick={() => setCount((currentCount) => currentCount + 1)}
					className="rounded-lg bg-sky-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-sky-400"
				>
					Add 1
				</button>
				<button
					type="button"
					onClick={() => setCount((currentCount) => currentCount - 1)}
					className="rounded-lg border border-slate-700 px-5 py-3 font-semibold text-slate-200 transition hover:border-sky-400 hover:text-sky-300"
				>
					Subtract 1
				</button>
				<button
					type="button"
					onClick={() => setCount(0)}
					className="rounded-lg border border-slate-700 px-5 py-3 font-semibold text-slate-200 transition hover:border-red-400 hover:text-red-300"
				>
					Reset
				</button>
			</div>
		</section>
	);
}
