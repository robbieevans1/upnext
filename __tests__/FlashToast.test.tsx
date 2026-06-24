import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import FlashToast from "@/components/FlashToast";

const mocks = vi.hoisted(() => ({
	dismissFlashNotification: vi.fn(),
}));

vi.mock("@/app/actions/notifications", () => ({
	dismissFlashNotification: mocks.dismissFlashNotification,
}));

describe("FlashToast", () => {
	beforeEach(() => {
		mocks.dismissFlashNotification.mockClear();
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("renders the flash notification without clearing it immediately", async () => {
		render(
			<FlashToast
				notification={{
					id: "toast-1",
					message: "Task deleted.",
				}}
			/>,
		);

		expect(screen.getByRole("status")).toHaveTextContent("Task deleted.");
		expect(screen.getByRole("status")).toHaveClass("top-20");

		await act(async () => {
			await Promise.resolve();
		});

		expect(mocks.dismissFlashNotification).not.toHaveBeenCalled();
	});

	it("auto-dismisses after the display window", () => {
		render(
			<FlashToast
				notification={{
					id: "toast-1",
					message: "Commitment created.",
				}}
			/>,
		);

		expect(screen.getByRole("status")).toBeInTheDocument();

		act(() => {
			vi.advanceTimersByTime(2999);
		});

		expect(screen.getByRole("status")).toBeInTheDocument();
		expect(mocks.dismissFlashNotification).not.toHaveBeenCalled();

		act(() => {
			vi.advanceTimersByTime(1);
		});

		expect(screen.queryByRole("status")).toBeNull();
		expect(mocks.dismissFlashNotification).toHaveBeenCalledWith("toast-1");
	});

	it("renders nothing without a notification", () => {
		render(<FlashToast notification={null} />);

		expect(screen.queryByRole("status")).toBeNull();
		expect(mocks.dismissFlashNotification).not.toHaveBeenCalled();
	});
});
