import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const emptyModule = path.resolve(__dirname, "src/lib/empty-module.js");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { dev, isServer }) => {
    // Disable eval in devtool to prevent CSP (Content Security Policy) eval blocking in strict browsers/extensions
    if (dev) {
      config.devtool = false;
    }

    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };

    config.resolve.alias = {
      ...config.resolve.alias,
      "@base-org/account": emptyModule,
      "@coinbase/cdp-sdk": emptyModule,
      "@x402/evm/upto/client": emptyModule,
      "@x402/evm/exact/client": emptyModule,
      "@x402/core/client": emptyModule,
      "@x402/svm/exact/client": emptyModule,
      "@x402/evm": emptyModule,
      "@x402/core": emptyModule,
      "@react-native-async-storage/async-storage": emptyModule,
    };

    config.externals.push("pino-pretty", "lokijs", "encoding");

    return config;
  },
};

export default nextConfig;
