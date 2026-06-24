import { cookies } from "next/headers";

const FLASH_COOKIE = "upnext_flash";

export type FlashNotification = {
	id: string;
	message: string;
};

function encodeFlashNotification(notification: FlashNotification) {
	return encodeURIComponent(JSON.stringify(notification));
}

function decodeFlashNotification(value: string | undefined) {
	if (!value) {
		return null;
	}

	try {
		const parsed = JSON.parse(decodeURIComponent(value));

		if (
			typeof parsed?.id === "string" &&
			typeof parsed?.message === "string"
		) {
			return {
				id: parsed.id,
				message: parsed.message,
			} satisfies FlashNotification;
		}
	} catch {
		return null;
	}

	return null;
}

export async function getFlashNotification() {
	try {
		const cookieStore = await cookies();
		return decodeFlashNotification(cookieStore.get(FLASH_COOKIE)?.value);
	} catch {
		return null;
	}
}

export async function setFlashNotification(message: string) {
	try {
		const cookieStore = await cookies();
		cookieStore.set(FLASH_COOKIE, encodeFlashNotification({
			id: crypto.randomUUID(),
			message,
		}), {
			httpOnly: true,
			maxAge: 30,
			path: "/",
			sameSite: "lax",
		});
	} catch {
		// Server action unit tests run without a request cookie store.
	}
}

export async function clearFlashNotification(notificationId: string) {
	try {
		const cookieStore = await cookies();
		const currentNotification = decodeFlashNotification(
			cookieStore.get(FLASH_COOKIE)?.value,
		);

		if (!currentNotification || currentNotification.id !== notificationId) {
			return;
		}

		cookieStore.delete(FLASH_COOKIE);
	} catch {
		// No active request cookie store.
	}
}
