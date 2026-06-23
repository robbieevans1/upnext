"use client";

import { useEffect, useState } from "react";

function getCountdown(targetAt: string) {
	const diffMs = new Date(targetAt).getTime() - Date.now();
	const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));
	const days = Math.floor(totalSeconds / 86400);
	const hours = Math.floor((totalSeconds % 86400) / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;

	if (days > 0) {
		return `${days}d ${hours}h ${minutes}m`;
	}

	if (hours > 0) {
		return `${hours}h ${minutes}m ${seconds}s`;
	}

	return `${minutes}m ${seconds}s`;
}

export default function AnnouncementCountdown({
	targetAt,
}: {
	targetAt: string;
}) {
	const [countdown, setCountdown] = useState(() => getCountdown(targetAt));

	useEffect(() => {
		const interval = window.setInterval(() => {
			setCountdown(getCountdown(targetAt));
		}, 1000);

		return () => window.clearInterval(interval);
	}, [targetAt]);

	return <span>{countdown}</span>;
}
