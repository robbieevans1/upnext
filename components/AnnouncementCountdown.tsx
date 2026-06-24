"use client";

import { getAnnouncementCountdown } from "@/lib/announcement-countdown";
import { useEffect, useState } from "react";

export default function AnnouncementCountdown({
	initialCountdown,
	targetAt,
}: {
	initialCountdown: string;
	targetAt: string;
}) {
	const [countdown, setCountdown] = useState(initialCountdown);

	useEffect(() => {
		const interval = window.setInterval(() => {
			setCountdown(getAnnouncementCountdown(targetAt));
		}, 1000);

		return () => window.clearInterval(interval);
	}, [targetAt]);

	return <span>{countdown}</span>;
}
