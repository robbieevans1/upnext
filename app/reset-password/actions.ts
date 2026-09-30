"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { hashPasswordResetToken } from "@/lib/password-reset";
import { prisma } from "@/lib/prisma";

type ResetPasswordState = {
	error?: string;
};

export async function resetPassword(
	_prevState: ResetPasswordState,
	formData: FormData,
): Promise<ResetPasswordState> {
	const token = String(formData.get("token") || "");
	const password = String(formData.get("password") || "");

	if (!token) {
		return {
			error: "Reset link is invalid or expired.",
		};
	}

	if (password.length < 8) {
		return {
			error: "Password must be at least 8 characters.",
		};
	}

	const tokenHash = hashPasswordResetToken(token);
	const resetToken = await prisma.passwordResetToken.findUnique({
		where: {
			tokenHash,
		},
		select: {
			id: true,
			expiresAt: true,
			usedAt: true,
			userId: true,
		},
	});

	if (
		!resetToken ||
		resetToken.usedAt ||
		resetToken.expiresAt.getTime() <= Date.now()
	) {
		return {
			error: "Reset link is invalid or expired.",
		};
	}

	const passwordHash = await bcrypt.hash(password, 12);
	const usedAt = new Date();

	await prisma.$transaction([
		prisma.user.update({
			where: {
				id: resetToken.userId,
			},
			data: {
				passwordHash,
			},
		}),
		prisma.passwordResetToken.update({
			where: {
				id: resetToken.id,
			},
			data: {
				usedAt,
			},
		}),
	]);

	redirect("/login?reset=1");
}
