import { defineConfig } from "tsup";
import { chmod } from "node:fs/promises";
import { join } from "node:path";

export default defineConfig({
  entry: ["src/cli.ts"],
  format: ["esm"],
  target: "node20",
  outDir: "dist",
  clean: true,
  bundle: true,
  splitting: false,
  sourcemap: false,
  minify: false,
  shims: false,
  banner: { js: "#!/usr/bin/env node" },
  loader: { ".js": "text" },
  async onSuccess() {
    if (process.platform !== "win32") {
      await chmod(join("dist", "cli.js"), 0o755);
    }
  },
});
