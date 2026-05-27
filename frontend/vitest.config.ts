import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    define: {
        "import.meta.env.VITE_API_URL": JSON.stringify("http://localhost:4008/api"),
    },
    test: {
        environment: "jsdom",
        globals: true,
        setupFiles: "./src/tests/setup.ts",
        css: true,
    },
});
