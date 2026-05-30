import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const basePath = process.env.BASE_PATH || "";
const root = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  reactStrictMode: false,
  assetPrefix: basePath,
  basePath,
  trailingSlash: true,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  turbopack: {
    root,
  },
};

export default nextConfig;
