import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import CounterTool from "@/components/CounterTool";

describe("CounterTool", () => {
	beforeEach(() => {
		window.localStorage.clear();
	});

	it("increments, decrements, and resets the counter", () => {
		render(<CounterTool />);

		const value = screen.getByTestId("counter-value");

		expect(value).toHaveTextContent("0");

		fireEvent.click(screen.getByRole("button", { name: "Add 1" }));
		fireEvent.click(screen.getByRole("button", { name: "Add 1" }));

		expect(value).toHaveTextContent("2");

		fireEvent.click(screen.getByRole("button", { name: "Subtract 1" }));

		expect(value).toHaveTextContent("1");

		fireEvent.click(screen.getByRole("button", { name: "Reset" }));

		expect(value).toHaveTextContent("0");
	});

	it("loads a saved counter value", async () => {
		window.localStorage.setItem("upnext.tools.counter.value", "12");

		render(<CounterTool />);

		await waitFor(() => {
			expect(screen.getByTestId("counter-value")).toHaveTextContent("12");
		});
	});

	it("saves changes until reset", async () => {
		render(<CounterTool />);

		fireEvent.click(screen.getByRole("button", { name: "Add 1" }));
		fireEvent.click(screen.getByRole("button", { name: "Add 1" }));

		await waitFor(() => {
			expect(window.localStorage.getItem("upnext.tools.counter.value")).toBe(
				"2",
			);
		});

		fireEvent.click(screen.getByRole("button", { name: "Reset" }));

		await waitFor(() => {
			expect(window.localStorage.getItem("upnext.tools.counter.value")).toBe(
				"0",
			);
		});
		expect(screen.getByTestId("counter-value")).toHaveTextContent("0");
	});
});
