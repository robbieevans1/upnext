import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [react()],
	resolve: {
		tsconfigPaths: true,
	},
	test: {
		coverage: {
			exclude: [
				".next/**",
				"coverage/**",
				"next-env.d.ts",
				"vitest.config.mts",
			],
			provider: "v8",
			reporter: ["text", "html"],
		},
		environment: "jsdom",
		environmentOptions: {
			jsdom: {
				url: "http://localhost:3000",
			},
		},
		globals: true,
		setupFiles: ["./vitest.setup.ts"],
	},
});
