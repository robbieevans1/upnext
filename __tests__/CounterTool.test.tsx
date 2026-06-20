import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import CounterTool from "@/components/CounterTool";

describe("CounterTool", () => {
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
});
