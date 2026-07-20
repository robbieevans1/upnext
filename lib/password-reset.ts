import { createHash, randomBytes } from "crypto";

const PASSWORD_RESET_TOKEN_BYTES = 32;
const PASSWORD_RESET_EXPIRY_MINUTES = 60;
export const PASSWORD_RESET_SUCCESS_MESSAGE =
	"If an account exists for that email, a password reset link has been sent.";

export function createPasswordResetToken() {
	return randomBytes(PASSWORD_RESET_TOKEN_BYTES).toString("base64url");
}

export function hashPasswordResetToken(token: string) {
	return createHash("sha256").update(token).digest("hex");
}

export function getPasswordResetExpiresAt(now = new Date()) {
	return new Date(now.getTime() + PASSWORD_RESET_EXPIRY_MINUTES * 60 * 1000);
}

export function getPasswordResetUrl(token: string) {
	const baseUrl =
		process.env.NEXTAUTH_URL ||
		process.env.VERCEL_PROJECT_PRODUCTION_URL ||
		"http://localhost:3000";
	const normalizedBaseUrl = baseUrl.startsWith("http")
		? baseUrl
		: `https://${baseUrl}`;
	const url = new URL("/reset-password", normalizedBaseUrl);

	url.searchParams.set("token", token);

	return url.toString();
}
