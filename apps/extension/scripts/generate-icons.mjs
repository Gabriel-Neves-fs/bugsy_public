import { mkdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const iconsDirectory = resolve(scriptDirectory, "../public/icons");
const source = await readFile(resolve(iconsDirectory, "bugsy-icon.svg"));
const sizes = [16, 32, 48, 128];

await mkdir(iconsDirectory, { recursive: true });

await Promise.all(
  sizes.map((size) =>
    sharp(source)
      .resize(size, size)
      .png()
      .toFile(resolve(iconsDirectory, `icon-${size}.png`)),
  ),
);

console.info(`Generated Bugsy extension icons: ${sizes.join(", ")}px.`);
