import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["@huggingface/transformers", "onnxruntime-node", "sharp", "sqlite-vec"],
  outputFileTracingIncludes: {
    "/*": ["./node_modules/onnxruntime-node/bin/**/*"],
  },
};

export default nextConfig;
