import type { NextConfig } from "next";

const authUrl =
  process.env.NEXTAUTH_URL && process.env.NEXTAUTH_URL.trim() !== ""
    ? process.env.NEXTAUTH_URL
    : process.env.VERCEL_URL && process.env.VERCEL_URL.trim() !== ""
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

process.env.NEXTAUTH_URL = authUrl;

const nextConfig: NextConfig = {
  env: {
    NEXTAUTH_URL: authUrl,
  },
};

export default nextConfig;
