import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LoginForm from "@/app/login/LoginForm";

const mocks = vi.hoisted(() => ({
	get: vi.fn(),
	push: vi.fn(),
	refresh: vi.fn(),
	signIn: vi.fn(),
}));

vi.mock("next/navigation", () => ({
	useRouter: () => ({
		push: mocks.push,
		refresh: mocks.refresh,
	}),
	useSearchParams: () => ({
		get: mocks.get,
	}),
}));
vi.mock("next-auth/react", () => ({
	signIn: mocks.signIn,
}));

describe("LoginForm", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.get.mockReturnValue(null);
		mocks.signIn.mockResolvedValue({});
	});

	it("shows the account-created message from the query string", () => {
		mocks.get.mockImplementation((key: string) => (key === "created" ? "1" : null));

		render(<LoginForm />);

		expect(
			screen.getByText("Account created. You can log in now."),
		).toBeInTheDocument();
	});

	it("links to password reset and shows the reset message from the query string", () => {
		mocks.get.mockImplementation((key: string) => (key === "reset" ? "1" : null));

		render(<LoginForm />);

		expect(screen.getByText("Password reset. You can log in now.")).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Forgot password?" })).toHaveAttribute(
			"href",
			"/forgot-password",
		);
	});

	it("submits credentials through NextAuth and navigates to today on success", async () => {
		render(<LoginForm />);

		fireEvent.change(screen.getByLabelText("Email"), {
			target: { value: "person@example.com" },
		});
		fireEvent.change(screen.getByLabelText("Password"), {
			target: { value: "password123" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Log in" }));

		await waitFor(() =>
			expect(mocks.signIn).toHaveBeenCalledWith("credentials", {
				email: "person@example.com",
				password: "password123",
				redirect: false,
			}),
		);
		expect(mocks.push).toHaveBeenCalledWith("/today");
		expect(mocks.refresh).toHaveBeenCalled();
	});

	it("shows a generic error when NextAuth rejects credentials", async () => {
		mocks.signIn.mockResolvedValue({ error: "CredentialsSignin" });
		render(<LoginForm />);

		fireEvent.change(screen.getByLabelText("Email"), {
			target: { value: "person@example.com" },
		});
		fireEvent.change(screen.getByLabelText("Password"), {
			target: { value: "bad-password" },
		});
		fireEvent.submit(
			screen.getByRole("button", { name: "Log in" }).closest("form")!,
		);

		expect(
			await screen.findByText("Invalid email or password."),
		).toBeInTheDocument();
		expect(mocks.push).not.toHaveBeenCalled();
	});
});
