import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import DailyWeightForm from "@/app/nutrition/DailyWeightForm";
import { saveWeightEntry } from "@/app/actions/nutrition";

vi.mock("@/app/actions/nutrition", () => ({ saveWeightEntry: vi.fn() }));

beforeEach(() => {
	localStorage.clear();
	vi.mocked(saveWeightEntry).mockReset();
	vi.mocked(saveWeightEntry).mockResolvedValue({ weightLbs: 179, previousLow: 180, achievedAt: "2026-06-23T04:00:00.000Z" });
});

async function save() {
	fireEvent.change(screen.getByLabelText("Weight in pounds"), { target: { value: "179" } });
	await act(async () => {
		fireEvent.submit(screen.getByRole("button", { name: "Save Weight" }).closest("form")!);
	});
	await screen.findByText("Weight saved.");
}

it("shows the record details at the top and supports dismissal and another record", async () => {
	render(<DailyWeightForm userId="user-1" />);
	await save();
	expect(screen.getByText("New low weight: 179.0 lb")).toBeInTheDocument();
	expect(screen.getByText(/Previous low: 180.0 lb · Achieved/)).toHaveTextContent("6/23/2026");
	fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
	expect(screen.queryByText(/New low weight:/)).not.toBeInTheDocument();
	vi.mocked(saveWeightEntry).mockResolvedValueOnce({ weightLbs: 178, previousLow: 179, achievedAt: "2026-06-23T04:00:00.000Z" });
	await save();
	expect(screen.getByText("New low weight: 178.0 lb")).toBeInTheDocument();
});

it("persists the off toggle across visits while continuing to save weights", async () => {
	const view = render(<DailyWeightForm userId="user-1" />);
	fireEvent.click(screen.getByRole("switch"));
	expect(localStorage.getItem("upnext:low-weight-banner:user-1")).toBe("off");
	view.unmount();
	render(<DailyWeightForm userId="user-1" />);
	expect(screen.getByRole("switch")).not.toBeChecked();
	await save();
	expect(saveWeightEntry).toHaveBeenCalled();
	expect(screen.queryByText(/New low weight:/)).not.toBeInTheDocument();
	fireEvent.click(screen.getByRole("switch"));
	await save();
	expect(screen.getByText(/New low weight:/)).toBeInTheDocument();
});

it("shows a save failure without a record banner", async () => {
	vi.mocked(saveWeightEntry).mockRejectedValueOnce(new Error("offline"));
	render(<DailyWeightForm userId="user-1" />);
	await act(async () => {
		fireEvent.submit(screen.getByRole("button", { name: "Save Weight" }).closest("form")!);
	});
	await waitFor(() => expect(screen.getByText(/Could not save your weight/)).toBeInTheDocument());
	expect(screen.queryByText(/New low weight:/)).not.toBeInTheDocument();
});
