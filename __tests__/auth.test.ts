import { beforeEach, describe, expect, it, vi } from "vitest";

const prisma = {
	user: {
		findUnique: vi.fn(),
	},
};
const compare = vi.fn();

vi.mock("@/lib/prisma", () => ({ prisma }));
vi.mock("bcryptjs", () => ({
	default: {
		compare,
	},
}));

describe("authOptions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	type Credentials = { email?: string; password?: string };

	async function authorize(credentials: Credentials) {
		const { authOptions } = await import("@/lib/auth");
		const provider = authOptions.providers[0] as unknown as {
			options: {
				authorize: (credentials: Credentials) => unknown;
			};
		};

		return provider.options.authorize(credentials);
	}

	it("normalizes emails before credential lookup", async () => {
		prisma.user.findUnique.mockResolvedValue({
			id: "user-1",
			name: "Robert",
			email: "robert@example.com",
			passwordHash: "hash",
		});
		compare.mockResolvedValue(true);

		await expect(
			authorize({
				email: " ROBERT@example.com ",
				password: "password123",
			}),
		).resolves.toEqual({
			id: "user-1",
			name: "Robert",
			email: "robert@example.com",
		});
		expect(prisma.user.findUnique).toHaveBeenCalledWith({
			where: {
				email: "robert@example.com",
			},
		});
		expect(compare).toHaveBeenCalledWith("password123", "hash");
	});

	it("rejects missing credentials", async () => {
		await expect(authorize({ email: "", password: "password123" })).resolves.toBe(
			null,
		);
		await expect(
			authorize({ email: "person@example.com", password: "" }),
		).resolves.toBe(null);
		expect(prisma.user.findUnique).not.toHaveBeenCalled();
	});

	it("rejects unknown users and users without password hashes", async () => {
		prisma.user.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({
			id: "user-1",
			email: "person@example.com",
			passwordHash: null,
		});

		await expect(
			authorize({ email: "person@example.com", password: "password123" }),
		).resolves.toBe(null);
		await expect(
			authorize({ email: "person@example.com", password: "password123" }),
		).resolves.toBe(null);
		expect(compare).not.toHaveBeenCalled();
	});

	it("rejects invalid passwords", async () => {
		prisma.user.findUnique.mockResolvedValue({
			id: "user-1",
			email: "person@example.com",
			passwordHash: "hash",
		});
		compare.mockResolvedValue(false);

		await expect(
			authorize({ email: "person@example.com", password: "wrong-password" }),
		).resolves.toBe(null);
	});

	it("copies the user id into jwt and session callbacks", async () => {
		const { authOptions } = await import("@/lib/auth");
		const token = await authOptions.callbacks?.jwt?.({
			token: {},
			user: { id: "user-1" },
		} as never);

		expect(token).toEqual({ id: "user-1" });

		const session = await authOptions.callbacks?.session?.({
			session: { user: { name: "Robert", email: "robert@example.com" } },
			token,
		} as never);

		expect(session).toEqual({
			user: {
				id: "user-1",
				name: "Robert",
				email: "robert@example.com",
			},
		});
	});
});
