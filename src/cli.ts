import open from "open";
import { run } from "./pipeline.js";

async function main(): Promise<void> {
  const result = await run();
  if (result.outPath) {
    process.stdout.write(`Wrote ${result.outPath}\n`);
    await open(result.outPath);
    return;
  }
  process.stderr.write(result.reason + "\n");
}

main().catch((err) => {
  process.stderr.write(`whatdidclaudesay: ${(err as Error).message}\n`);
  process.exit(1);
});
