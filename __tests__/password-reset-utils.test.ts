import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	getPasswordResetExpiresAt,
	getPasswordResetUrl,
	hashPasswordResetToken,
} from "@/lib/password-reset";
import { sendPasswordResetEmail } from "@/lib/email";

const originalEnv = process.env;

describe("password reset utilities", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		process.env = { ...originalEnv };
	});

	afterEach(() => {
		process.env = originalEnv;
		vi.unstubAllGlobals();
	});

	it("hashes reset tokens without exposing the raw token", () => {
		const hash = hashPasswordResetToken("raw-token");

		expect(hash).toHaveLength(64);
		expect(hash).not.toBe("raw-token");
		expect(hash).toBe(hashPasswordResetToken("raw-token"));
	});

	it("builds reset links from NEXTAUTH_URL", () => {
		process.env.NEXTAUTH_URL = "https://upnext.example";

		expect(getPasswordResetUrl("abc123")).toBe(
			"https://upnext.example/reset-password?token=abc123",
		);
	});

	it("expires reset tokens after 60 minutes", () => {
		expect(
			getPasswordResetExpiresAt(new Date("2026-07-19T16:00:00.000Z")),
		).toEqual(new Date("2026-07-19T17:00:00.000Z"));
	});

	it("logs reset links in development when Resend is not configured", async () => {
		delete process.env.RESEND_API_KEY;
		delete process.env.PASSWORD_RESET_EMAIL_FROM;
		const info = vi.spyOn(console, "info").mockImplementation(() => {});

		await sendPasswordResetEmail({
			to: "person@example.com",
			resetUrl: "https://upnext.example/reset-password?token=abc123",
		});

		expect(info).toHaveBeenCalledWith(
			"Password reset link for person@example.com: https://upnext.example/reset-password?token=abc123",
		);
	});

	it("uses Resend when configured", async () => {
		process.env.RESEND_API_KEY = "resend-key";
		process.env.PASSWORD_RESET_EMAIL_FROM = "UpNext <reset@example.com>";
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
		});
		vi.stubGlobal("fetch", fetchMock);

		await sendPasswordResetEmail({
			to: "person@example.com",
			resetUrl: "https://upnext.example/reset-password?token=abc123",
		});

		expect(fetchMock).toHaveBeenCalledWith(
			"https://api.resend.com/emails",
			expect.objectContaining({
				method: "POST",
				headers: {
					Authorization: "Bearer resend-key",
					"Content-Type": "application/json",
				},
			}),
		);
	});
});
