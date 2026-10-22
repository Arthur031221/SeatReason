import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

const STATIC_FILES = [
  "./",
  "favicon.svg",
  "manifest.webmanifest",
  "icon-192.png",
  "icon-512.png",
];

/** Writes sw.js next to the bundle so the app opens without a network. */
function offlineWorker(): Plugin {
  return {
    name: "seatreason-offline",
    apply: "build",
    generateBundle(_options, bundle) {
      const files = [...STATIC_FILES, ...Object.keys(bundle)];
      const version = createHash("sha256")
        .update(files.join("\n"))
        .digest("hex")
        .slice(0, 10);
      const source = readFileSync("scripts/sw-template.js", "utf8")
        .replace("-__VERSION__", `-${version}`)
        .replace("= __FILES__;", `= ${JSON.stringify(files)};`);
      this.emitFile({ type: "asset", fileName: "sw.js", source });
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: [react(), offlineWorker()],
  worker: { format: "es" },
  test: {
    environment: "node",
    exclude: ["tests/e2e/**", "node_modules/**", "dist/**"],
  },
});
