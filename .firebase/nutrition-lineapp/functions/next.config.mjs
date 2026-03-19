// next.config.mjs
import path from "node:path";
var nextConfig = {
  typedRoutes: true,
  outputFileTracingRoot: path.resolve()
};
var next_config_default = nextConfig;
export {
  next_config_default as default
};
