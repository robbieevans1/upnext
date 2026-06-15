import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

function createStorageMock(): Storage {
	let store = new Map<string, string>();

	return {
		get length() {
			return store.size;
		},
		clear() {
			store = new Map();
		},
		getItem(key: string) {
			return store.get(key) ?? null;
		},
		key(index: number) {
			return Array.from(store.keys())[index] ?? null;
		},
		removeItem(key: string) {
			store.delete(key);
		},
		setItem(key: string, value: string) {
			store.set(key, String(value));
		},
	};
}

Object.defineProperty(globalThis, "localStorage", {
	configurable: true,
	value: createStorageMock(),
});

afterEach(() => {
	cleanup();
	vi.useRealTimers();
	vi.unstubAllGlobals();
});
