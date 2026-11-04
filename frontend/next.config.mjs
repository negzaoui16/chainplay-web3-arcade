import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const emptyShim = path.resolve(__dirname, "src/lib/empty-shim.js");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };

    config.resolve.alias = {
      ...config.resolve.alias,
      "@base-org/account": emptyShim,
      "@coinbase/cdp-sdk": emptyShim,
      "@x402/evm/upto/client": emptyShim,
      "@x402/evm/exact/client": emptyShim,
      "@x402/core/client": emptyShim,
      "@x402/svm/exact/client": emptyShim,
      "@x402/evm": emptyShim,
      "@x402/core": emptyShim,
      "@x402/svm": emptyShim,
      "@react-native-async-storage/async-storage": emptyShim,
    };

    config.externals.push("pino-pretty", "lokijs", "encoding");

    return config;
  },
};

export default nextConfig;
