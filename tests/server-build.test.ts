import { execFile } from "node:child_process";
import {
  mkdtemp,
  readFile,
  readdir,
  mkdir,
  writeFile,
  rm,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";
import ts from "typescript";
import { expect, it } from "vitest";

const run = promisify(execFile);
const root = fileURLToPath(new URL("../", import.meta.url));

it("starts the compiled API in Node without TypeScript source files or Vite", async () => {
  const temporaryRoot = resolve(tmpdir());
  const output = await mkdtemp(join(temporaryRoot, "spring-radio-build-"));
  // Validate the exact directory before any cleanup can run.
  if (
    dirname(output) !== temporaryRoot ||
    !basename(output).startsWith("spring-radio-build-")
  ) {
    throw new Error("Unexpected smoke-test output directory");
  }
  try {
    const configFile = ts.readConfigFile(
      join(root, "tsconfig.json"),
      ts.sys.readFile,
    );
    const config = ts.parseJsonConfigFileContent(
      configFile.config,
      ts.sys,
      root,
    );
    await writeFile(
      join(output, "package.json"),
      JSON.stringify({ type: "module" }),
    );
    for (const folder of ["api", "server"]) {
      await mkdir(join(output, folder));
      for (const name of await readdir(join(root, folder))) {
        if (!name.endsWith(".ts") || name.endsWith(".d.ts")) continue;
        const fileName = join(root, folder, name);
        const result = ts.transpileModule(await readFile(fileName, "utf8"), {
          fileName,
          compilerOptions: {
            ...config.options,
            noEmit: false,
            sourceMap: false,
          },
        });
        await writeFile(
          join(output, folder, name.replace(/\.ts$/, ".js")),
          result.outputText,
        );
      }
    }
    const entry = pathToFileURL(join(output, "api/music.js")).href;
    const { stdout } = await run(
      process.execPath,
      [
        "--input-type=module",
        "--eval",
        `
      import handler from ${JSON.stringify(entry)};
      let body;
      const response = { statusCode: 0, setHeader() {}, end(value) { body = value; } };
      await handler({ method: "GET", url: "/api/music?action=invalid" }, response);
      console.log(JSON.stringify({ status: response.statusCode, body: JSON.parse(body) }));
    `,
      ],
      {
        cwd: output,
        timeout: 10_000,
        env: { ...process.env, MUSIC_PLAYLIST_ID: "3778678" },
      },
    );
    expect(JSON.parse(stdout)).toEqual({
      status: 400,
      body: { error: "没有这个电台操作。" },
    });
  } finally {
    // Only remove this test's validated, newly created directory.
    await rm(output, { recursive: true, force: true });
  }
}, 15_000);
