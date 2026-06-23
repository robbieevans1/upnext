import { describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";

describe("generated Prisma Client", () => {
	it("exposes current application models", async () => {
		const prisma = new PrismaClient();

		try {
			expect(prisma.calorieEntry).toBeDefined();
			expect(prisma.weightEntry).toBeDefined();
			expect(prisma.announcement).toBeDefined();
		} finally {
			await prisma.$disconnect();
		}
	});
});
