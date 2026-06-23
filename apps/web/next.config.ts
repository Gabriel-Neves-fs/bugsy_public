import { existsSync } from "node:fs";
import { resolve } from "node:path";

import type { NextConfig } from "next";

const rootEnvPath = resolve(process.cwd(), "../../.env");

if (existsSync(rootEnvPath)) {
  process.loadEnvFile(rootEnvPath);
}

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
};

export default nextConfig;
