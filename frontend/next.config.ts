import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Disabilita ESLint durante il build in produzione
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Ignora errori TypeScript durante il build (opzionale, ma più sicuro lasciarli)
    // ignoreBuildErrors: true,
  },
};

export default nextConfig;
