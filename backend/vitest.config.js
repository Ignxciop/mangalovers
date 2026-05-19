import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        globals: true,
        setupFiles: "./tests/setup.js",
        fileParallelism: false,
        testTimeout: 30000,
        hookTimeout: 30000,
    },
});
