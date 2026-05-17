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
    await mkdir(join("dist", "vendor", "fonts"), { recursive: true });
    await cp(
      join("src", "vendor", "wordcloud2.js"),
      join("dist", "vendor", "wordcloud2.js"),
    );
    await cp(
      join("src", "vendor", "html-to-image.js"),
      join("dist", "vendor", "html-to-image.js"),
    );
    for (const f of [
      "anton-400.woff2",
      "archivo-narrow.woff2",
      "inter.woff2",
      "jetbrains-mono.woff2",
    ]) {
      await cp(
        join("src", "vendor", "fonts", f),
        join("dist", "vendor", "fonts", f),
      );
    }
    if (process.platform !== "win32") {
      await chmod(join("dist", "cli.js"), 0o755);
    }
  },
});
