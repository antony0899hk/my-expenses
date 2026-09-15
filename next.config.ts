import type { NextConfig } from "next";
import { readFileSync } from "node:fs";

const appVersion = readFileSync(new URL("./VERSION", import.meta.url), "utf8").trim();

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: appVersion,
  },
};

export default nextConfig;
