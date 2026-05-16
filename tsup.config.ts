import { defineConfig } from "tsup";
import { chmod, cp, mkdir } from "node:fs/promises";
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
  async onSuccess() {
    await mkdir(join("dist", "vendor"), { recursive: true });
    await cp(
      join("src", "vendor", "wordcloud2.js"),
      join("dist", "vendor", "wordcloud2.js"),
    );
    await cp(
      join("src", "vendor", "html-to-image.js"),
      join("dist", "vendor", "html-to-image.js"),
    );
    if (process.platform !== "win32") {
      await chmod(join("dist", "cli.js"), 0o755);
    }
  },
});
