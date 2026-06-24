"use client";

import { useEffect, useState, useTransition } from "react";
import { dismissFlashNotification } from "@/app/actions/notifications";
import type { FlashNotification } from "@/lib/flash-notifications";

const FLASH_TOAST_DISPLAY_MS = 3000;

export default function FlashToast({
	notification,
}: {
	notification: FlashNotification | null;
}) {
	const [, startTransition] = useTransition();
	const [visibleNotification, setVisibleNotification] =
		useState(notification);

	useEffect(() => {
		if (!visibleNotification) {
			return;
		}

		const notificationId = visibleNotification.id;
		const timeout = window.setTimeout(() => {
			setVisibleNotification((currentNotification) =>
				currentNotification?.id === notificationId ? null : currentNotification,
			);

			startTransition(async () => {
				await dismissFlashNotification(notificationId);
			});
		}, FLASH_TOAST_DISPLAY_MS);

		return () => window.clearTimeout(timeout);
	}, [visibleNotification]);

	if (!visibleNotification) {
		return null;
	}

	return (
		<div
			role="status"
			aria-live="polite"
			className="fixed left-1/2 top-20 z-[70] w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 rounded-xl border border-emerald-400/30 bg-slate-950 px-4 py-3 text-center text-sm font-semibold text-emerald-100 shadow-2xl shadow-black/40 sm:top-24"
		>
			{visibleNotification.message}
		</div>
	);
}
