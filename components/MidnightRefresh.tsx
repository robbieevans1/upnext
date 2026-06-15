"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function MidnightRefresh() {
	const router = useRouter();

	useEffect(() => {
		function getMsUntilMidnight() {
			const now = new Date();
			const tomorrow = new Date(
				now.getFullYear(),
				now.getMonth(),
				now.getDate() + 1,
				0,
				0,
				5
			);

			return tomorrow.getTime() - now.getTime();
		}

		const timeout = setTimeout(() => {
			router.refresh();
		}, getMsUntilMidnight());

		return () => clearTimeout(timeout);
	}, [router]);

	return null;
}