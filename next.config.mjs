import path from "node:path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  typedRoutes: true,
  outputFileTracingRoot: path.resolve()
};

export default nextConfig;
