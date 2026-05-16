import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["plugins/apple-productivity/src/**/*.test.ts"],
    environment: "node"
  }
});

