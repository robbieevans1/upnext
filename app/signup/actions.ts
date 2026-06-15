"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

type SignUpState = {
	error?: string;
};

export async function signUpAction(
	_prevState: SignUpState,
	formData: FormData
): Promise<SignUpState> {
	const name = String(formData.get("name") || "").trim();
	const email = String(formData.get("email") || "").toLowerCase().trim();
	const password = String(formData.get("password") || "");

	if (!email || !email.includes("@")) {
		return {
			error: "Enter a valid email.",
		};
	}

	if (password.length < 8) {
		return {
			error: "Password must be at least 8 characters.",
		};
	}

	const existingUser = await prisma.user.findUnique({
		where: {
			email,
		},
	});

	if (existingUser) {
		return {
			error: "An account with this email already exists.",
		};
	}

	const passwordHash = await bcrypt.hash(password, 12);

	await prisma.user.create({
		data: {
			name: name || null,
			email,
			passwordHash,
		},
	});

	redirect("/login?created=1");
}