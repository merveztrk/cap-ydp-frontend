import type { NextConfig } from "next";

function getBackendApiUrl() {
  const configuredUrl =
    process.env.BACKEND_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_URL?.trim();

  if (!configuredUrl && process.env.VERCEL) {
    throw new Error(
      "Set BACKEND_API_URL in Vercel to the backend API origin (for example, https://your-backend.onrender.com).",
    );
  }

  const backendUrl = new URL(configuredUrl || "http://localhost:5021");

  if (
    !["http:", "https:"].includes(backendUrl.protocol) ||
    backendUrl.username ||
    backendUrl.password ||
    backendUrl.search ||
    backendUrl.hash
  ) {
    throw new Error(
      "BACKEND_API_URL must be an absolute HTTP(S) URL without credentials, query parameters, or a fragment.",
    );
  }

  const basePath = backendUrl.pathname
    .replace(/\/+$/, "")
    .replace(/\/api$/i, "");

  return `${backendUrl.origin}${basePath}`;
}

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${getBackendApiUrl()}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
