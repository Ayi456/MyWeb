import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import type { Plugin, ResolvedConfig } from "vite";

/**
 * Emits dist/sw.js with this build's app shell and a content version, so each
 * deploy installs fresh caches and removes the previous ones.
 */
export function offlineShell(): Plugin {
  let config: ResolvedConfig;
  return {
    name: "offline-shell",
    apply: "build",
    enforce: "post",
    configResolved(resolved) {
      config = resolved;
    },
    generateBundle(_options, bundle) {
      const files = new Map<string, string | Uint8Array>();
      for (const output of Object.values(bundle))
        files.set(
          output.fileName,
          output.type === "chunk" ? output.code : output.source,
        );
      if (config.publicDir)
        for (const file of listFiles(config.publicDir))
          files.set(file, readFileSync(join(config.publicDir, file)));
      const template = readFileSync(
        resolve(config.root, "src/pwa/sw.js"),
        "utf8",
      );
      const entries = precacheEntries([...files.keys()]);
      const hash = createHash("sha256").update(template);
      for (const name of [...files.keys()].sort())
        hash.update(name).update(files.get(name)!);
      this.emitFile({
        type: "asset",
        fileName: "sw.js",
        source: serviceWorkerSource(
          template,
          entries,
          hash.digest("hex").slice(0, 12),
        ),
      });
    },
  };
}

/** Everything the island needs offline; the share image and maps stay online. */
export function precacheEntries(files: string[]) {
  return files
    .filter((file) => !/(\.map$|^og\.jpg$|^sw\.js$|^\.vite\/)/.test(file))
    .map((file) => (file === "index.html" ? "/" : `/${file}`))
    .sort();
}

export function serviceWorkerSource(
  template: string,
  entries: string[],
  version: string,
) {
  return `const VERSION = ${JSON.stringify(version)};\nconst PRECACHE = ${JSON.stringify(entries)};\n${template}`;
}

function listFiles(root: string, dir = root): string[] {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries.flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return listFiles(root, path);
    return entry.isFile() ? [relative(root, path).split(sep).join("/")] : [];
  });
}
