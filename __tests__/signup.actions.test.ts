import { beforeEach, describe, expect, it, vi } from "vitest";
import { formDataFrom } from "./test-utils";

const prisma = {
	user: {
		create: vi.fn(),
		findUnique: vi.fn(),
	},
};
const hash = vi.fn();
const redirect = vi.fn((path: string) => {
	throw new Error(`redirect:${path}`);
});

vi.mock("@/lib/prisma", () => ({ prisma }));
vi.mock("bcryptjs", () => ({
	default: {
		hash,
	},
}));
vi.mock("next/navigation", () => ({ redirect }));

describe("signUpAction", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		hash.mockResolvedValue("hashed-password");
		prisma.user.findUnique.mockResolvedValue(null);
	});

	it("rejects invalid email addresses", async () => {
		const { signUpAction } = await import("@/app/signup/actions");

		await expect(
			signUpAction({}, formDataFrom({ email: "bad", password: "password123" })),
		).resolves.toEqual({
			error: "Enter a valid email.",
		});
		expect(prisma.user.findUnique).not.toHaveBeenCalled();
	});

	it("rejects short passwords", async () => {
		const { signUpAction } = await import("@/app/signup/actions");

		await expect(
			signUpAction(
				{},
				formDataFrom({ email: "person@example.com", password: "short" }),
			),
		).resolves.toEqual({
			error: "Password must be at least 8 characters.",
		});
	});

	it("rejects duplicate accounts", async () => {
		prisma.user.findUnique.mockResolvedValue({ id: "user-1" });
		const { signUpAction } = await import("@/app/signup/actions");

		await expect(
			signUpAction(
				{},
				formDataFrom({
					email: " PERSON@EXAMPLE.COM ",
					password: "password123",
				}),
			),
		).resolves.toEqual({
			error: "An account with this email already exists.",
		});
		expect(prisma.user.findUnique).toHaveBeenCalledWith({
			where: {
				email: "person@example.com",
			},
		});
	});

	it("creates users with a hashed password and redirects to login", async () => {
		const { signUpAction } = await import("@/app/signup/actions");

		await expect(
			signUpAction(
				{},
				formDataFrom({
					name: "  Robert  ",
					email: " ROBERT@example.com ",
					password: "password123",
				}),
			),
		).rejects.toThrow("redirect:/login?created=1");

		expect(hash).toHaveBeenCalledWith("password123", 12);
		expect(prisma.user.create).toHaveBeenCalledWith({
			data: {
				name: "Robert",
				email: "robert@example.com",
				passwordHash: "hashed-password",
			},
		});
		expect(redirect).toHaveBeenCalledWith("/login?created=1");
	});

	it("stores blank names as null", async () => {
		const { signUpAction } = await import("@/app/signup/actions");

		await expect(
			signUpAction(
				{},
				formDataFrom({
					name: "   ",
					email: "person@example.com",
					password: "password123",
				}),
			),
		).rejects.toThrow("redirect:/login?created=1");

		expect(prisma.user.create).toHaveBeenCalledWith({
			data: {
				name: null,
				email: "person@example.com",
				passwordHash: "hashed-password",
			},
		});
	});
});
