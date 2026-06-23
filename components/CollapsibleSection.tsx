"use client";

import { useCallback, useId, useState, useSyncExternalStore } from "react";

type CollapsibleSectionProps = {
	title: string;
	summary?: string;
	defaultOpen?: boolean;
	storageKey?: string;
	className?: string;
	children: React.ReactNode;
};

export default function CollapsibleSection({
	title,
	summary,
	defaultOpen = true,
	storageKey,
	className = "mt-8",
	children,
}: CollapsibleSectionProps) {
	const contentId = useId();
	const [fallbackOpen, setFallbackOpen] = useState(defaultOpen);
	const getSnapshot = useCallback(() => {
		if (!storageKey) {
			return defaultOpen;
		}

		const savedValue = window.localStorage.getItem(storageKey);

		if (savedValue === "open") return true;
		if (savedValue === "closed") return false;

		return defaultOpen;
	}, [defaultOpen, storageKey]);
	const subscribe = useCallback(
		(onStoreChange: () => void) => {
			if (!storageKey) return () => {};

			const eventName = `collapsible-section:${storageKey}`;

			window.addEventListener("storage", onStoreChange);
			window.addEventListener(eventName, onStoreChange);

			return () => {
				window.removeEventListener("storage", onStoreChange);
				window.removeEventListener(eventName, onStoreChange);
			};
		},
		[storageKey],
	);
	const storedOpen = useSyncExternalStore(
		subscribe,
		getSnapshot,
		() => defaultOpen,
	);
	const isOpen = storageKey ? storedOpen : fallbackOpen;

	function toggleOpen() {
		const nextValue = !isOpen;

		if (storageKey) {
			window.localStorage.setItem(storageKey, nextValue ? "open" : "closed");
			window.dispatchEvent(new Event(`collapsible-section:${storageKey}`));

			return;
		}

		setFallbackOpen(nextValue);
	}

	return (
		<section className={className}>
			<button
				type="button"
				aria-expanded={isOpen}
				aria-controls={contentId}
				onClick={toggleOpen}
				className="flex w-full items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-left transition hover:border-sky-500/70"
			>
				<span className="min-w-0">
					<span className="block truncate text-lg font-semibold text-slate-100">
						{title}
					</span>

					{summary && (
						<span className="mt-1 block truncate text-sm text-slate-500">
							{summary}
						</span>
					)}
				</span>

				<span
					aria-hidden="true"
					className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-700 text-xl leading-none text-sky-300"
				>
					{isOpen ? "-" : "+"}
				</span>
			</button>

			{isOpen && (
				<div id={contentId} className="mt-4">
					{children}
				</div>
			)}
		</section>
	);
}
