import { configDefaults, defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    // Git worktrees hold other checkouts of this repository; their tests are not this checkout's.
    exclude: [...configDefaults.exclude, ".worktrees/**"],
  },
});
