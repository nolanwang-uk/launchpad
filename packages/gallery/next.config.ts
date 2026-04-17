import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  // Transpile the workspace registry package (it's published as raw TS).
  transpilePackages: ["@launchpad/registry"],
};

export default config;
