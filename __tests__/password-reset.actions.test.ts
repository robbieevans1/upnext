import { beforeEach, describe, expect, it, vi } from "vitest";
import { formDataFrom } from "./test-utils";

const prisma = {
	$transaction: vi.fn(async (operations: unknown[]) => operations),
	user: {
		findUnique: vi.fn(),
		update: vi.fn((args) => args),
	},
	passwordResetToken: {
		create: vi.fn((args) => args),
		findUnique: vi.fn(),
		updateMany: vi.fn((args) => args),
		update: vi.fn((args) => args),
	},
};
const hash = vi.fn();
const redirect = vi.fn((path: string) => {
	throw new Error(`redirect:${path}`);
});
const createPasswordResetToken = vi.fn();
const hashPasswordResetToken = vi.fn();
const getPasswordResetExpiresAt = vi.fn();
const getPasswordResetUrl = vi.fn();
const sendPasswordResetEmail = vi.fn();

vi.mock("@/lib/prisma", () => ({ prisma }));
vi.mock("bcryptjs", () => ({
	default: {
		hash,
	},
}));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/lib/email", () => ({
	sendPasswordResetEmail,
}));
vi.mock("@/lib/password-reset", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@/lib/password-reset")>();

	return {
		...actual,
		createPasswordResetToken,
		hashPasswordResetToken,
		getPasswordResetExpiresAt,
		getPasswordResetUrl,
	};
});

describe("password reset actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useRealTimers();
		hash.mockResolvedValue("new-hashed-password");
		createPasswordResetToken.mockReturnValue("raw-token");
		hashPasswordResetToken.mockReturnValue("hashed-token");
		getPasswordResetExpiresAt.mockReturnValue(
			new Date("2026-07-19T17:00:00.000Z"),
		);
		getPasswordResetUrl.mockReturnValue(
			"https://upnext.example/reset-password?token=raw-token",
		);
		sendPasswordResetEmail.mockResolvedValue(undefined);
		prisma.user.findUnique.mockResolvedValue(null);
		prisma.passwordResetToken.findUnique.mockResolvedValue(null);
	});

	it("rejects invalid reset request emails", async () => {
		const { requestPasswordReset } = await import(
			"@/app/forgot-password/actions"
		);

		await expect(
			requestPasswordReset({}, formDataFrom({ email: "bad" })),
		).resolves.toEqual({
			error: "Enter a valid email.",
		});
		expect(prisma.user.findUnique).not.toHaveBeenCalled();
	});

	it("returns the generic success message for unknown emails", async () => {
		const { requestPasswordReset } = await import(
			"@/app/forgot-password/actions"
		);

		await expect(
			requestPasswordReset(
				{},
				formDataFrom({ email: "missing@example.com" }),
			),
		).resolves.toEqual({
			message:
				"If an account exists for that email, a password reset link has been sent.",
		});
		expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
		expect(sendPasswordResetEmail).not.toHaveBeenCalled();
	});

	it("creates a hashed reset token and sends the raw-token reset link", async () => {
		prisma.user.findUnique.mockResolvedValue({
			id: "user-1",
			email: "person@example.com",
		});
		const { requestPasswordReset } = await import(
			"@/app/forgot-password/actions"
		);

		await expect(
			requestPasswordReset(
				{},
				formDataFrom({ email: " PERSON@example.com " }),
			),
		).resolves.toEqual({
			message:
				"If an account exists for that email, a password reset link has been sent.",
		});

		expect(prisma.user.findUnique).toHaveBeenCalledWith({
			where: {
				email: "person@example.com",
			},
			select: {
				id: true,
				email: true,
			},
		});
		expect(prisma.passwordResetToken.updateMany).toHaveBeenCalledWith({
			where: {
				userId: "user-1",
				usedAt: null,
			},
			data: {
				usedAt: expect.any(Date),
			},
		});
		expect(prisma.passwordResetToken.create).toHaveBeenCalledWith({
			data: {
				userId: "user-1",
				tokenHash: "hashed-token",
				expiresAt: new Date("2026-07-19T17:00:00.000Z"),
			},
		});
		expect(sendPasswordResetEmail).toHaveBeenCalledWith({
			to: "person@example.com",
			resetUrl: "https://upnext.example/reset-password?token=raw-token",
		});
	});

	it("rejects short reset passwords before token lookup", async () => {
		const { resetPassword } = await import("@/app/reset-password/actions");

		await expect(
			resetPassword(
				{},
				formDataFrom({ token: "raw-token", password: "short" }),
			),
		).resolves.toEqual({
			error: "Password must be at least 8 characters.",
		});
		expect(prisma.passwordResetToken.findUnique).not.toHaveBeenCalled();
	});

	it("rejects missing, used, and expired reset tokens", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-07-19T16:00:00.000Z"));
		const { resetPassword } = await import("@/app/reset-password/actions");

		await expect(
			resetPassword(
				{},
				formDataFrom({ token: "raw-token", password: "password123" }),
			),
		).resolves.toEqual({
			error: "Reset link is invalid or expired.",
		});

		prisma.passwordResetToken.findUnique.mockResolvedValue({
			id: "reset-1",
			userId: "user-1",
			usedAt: new Date("2026-07-19T15:00:00.000Z"),
			expiresAt: new Date("2026-07-19T17:00:00.000Z"),
		});

		await expect(
			resetPassword(
				{},
				formDataFrom({ token: "raw-token", password: "password123" }),
			),
		).resolves.toEqual({
			error: "Reset link is invalid or expired.",
		});

		prisma.passwordResetToken.findUnique.mockResolvedValue({
			id: "reset-1",
			userId: "user-1",
			usedAt: null,
			expiresAt: new Date("2026-07-19T15:00:00.000Z"),
		});

		await expect(
			resetPassword(
				{},
				formDataFrom({ token: "raw-token", password: "password123" }),
			),
		).resolves.toEqual({
			error: "Reset link is invalid or expired.",
		});
		expect(prisma.user.update).not.toHaveBeenCalled();
	});

	it("updates the password and marks a valid reset token used", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-07-19T16:00:00.000Z"));
		prisma.passwordResetToken.findUnique.mockResolvedValue({
			id: "reset-1",
			userId: "user-1",
			usedAt: null,
			expiresAt: new Date("2026-07-19T17:00:00.000Z"),
		});
		const { resetPassword } = await import("@/app/reset-password/actions");

		await expect(
			resetPassword(
				{},
				formDataFrom({ token: "raw-token", password: "password123" }),
			),
		).rejects.toThrow("redirect:/login?reset=1");

		expect(hashPasswordResetToken).toHaveBeenCalledWith("raw-token");
		expect(hash).toHaveBeenCalledWith("password123", 12);
		expect(prisma.$transaction).toHaveBeenCalledWith([
			{
				where: {
					id: "user-1",
				},
				data: {
					passwordHash: "new-hashed-password",
				},
			},
			{
				where: {
					id: "reset-1",
				},
				data: {
					usedAt: new Date("2026-07-19T16:00:00.000Z"),
				},
			},
		]);
		expect(redirect).toHaveBeenCalledWith("/login?reset=1");
	});
});
