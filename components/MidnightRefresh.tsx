"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAppDateKey, getMsUntilNextAppMidnight } from "@/lib/app-date";

export default function MidnightRefresh() {
	const router = useRouter();

	useEffect(() => {
		let currentDateKey = getAppDateKey();
		let timeout: ReturnType<typeof setTimeout>;

		function refreshIfDateChanged() {
			const nextDateKey = getAppDateKey();

			if (nextDateKey === currentDateKey) {
				return;
			}

			currentDateKey = nextDateKey;
			router.refresh();
		}

		function scheduleRefresh() {
			clearTimeout(timeout);

			timeout = setTimeout(() => {
				refreshIfDateChanged();
				scheduleRefresh();
			}, getMsUntilNextAppMidnight());
		}

		function handleVisibilityChange() {
			if (document.visibilityState === "visible") {
				refreshIfDateChanged();
				scheduleRefresh();
			}
		}

		scheduleRefresh();
		window.addEventListener("focus", refreshIfDateChanged);
		document.addEventListener("visibilitychange", handleVisibilityChange);

		return () => {
			clearTimeout(timeout);
			window.removeEventListener("focus", refreshIfDateChanged);
			document.removeEventListener("visibilitychange", handleVisibilityChange);
		};
	}, [router]);

	return null;
}
