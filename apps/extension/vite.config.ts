import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { defineConfig, loadEnv, type Plugin } from "vite";

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, rootDir, "VITE_BUGSY_");
  const webOrigin = requireOrigin(environment.VITE_BUGSY_WEB_URL, "VITE_BUGSY_WEB_URL", mode);
  const apiOrigin = requireOrigin(environment.VITE_BUGSY_API_URL, "VITE_BUGSY_API_URL", mode);

  return {
    plugins: [buildManifestPlugin({ webOrigin, apiOrigin })],
    build: {
      emptyOutDir: true,
      outDir: "dist",
      rollupOptions: {
        input: {
          popup: resolve(rootDir, "popup.html"),
          offscreen: resolve(rootDir, "offscreen.html"),
          background: resolve(rootDir, "src/background.ts"),
          content: resolve(rootDir, "src/content.ts"),
        },
        output: {
          entryFileNames: "[name].js",
          chunkFileNames: "chunks/[name].js",
          assetFileNames: "assets/[name][extname]",
        },
      },
    },
  };
});

function requireOrigin(value: string | undefined, variableName: string, mode: string) {
  if (!value) {
    throw new Error(`Missing ${variableName} for the ${mode} extension build.`);
  }

  const url = new URL(value);

  if (mode === "production" && url.protocol !== "https:") {
    throw new Error(`${variableName} must use HTTPS in a production extension build.`);
  }

  return url.origin;
}

function buildManifestPlugin(options: { webOrigin: string; apiOrigin: string }): Plugin {
  return {
    name: "bugsy-extension-manifest",
    writeBundle() {
      const sourcePath = resolve(rootDir, "public/manifest.json");
      const outputPath = resolve(rootDir, "dist/manifest.json");
      const manifest = JSON.parse(readFileSync(sourcePath, "utf8")) as {
        externally_connectable: { matches: string[] };
        host_permissions: string[];
      };

      manifest.externally_connectable.matches = [`${options.webOrigin}/*`];
      manifest.host_permissions = [`${options.apiOrigin}/*`];

      writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    },
  };
}
