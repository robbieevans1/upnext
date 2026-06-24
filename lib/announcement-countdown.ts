export function getAnnouncementCountdown(targetAt: string, now = Date.now()) {
	const diffMs = new Date(targetAt).getTime() - now;
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
