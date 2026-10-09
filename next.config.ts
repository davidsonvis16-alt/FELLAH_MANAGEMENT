import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A stray package-lock.json in the home folder otherwise makes Next guess the wrong workspace root.
  outputFileTracingRoot: process.cwd(),
  // Ship the seeded demo database with every server function (see src/lib/db.ts).
  outputFileTracingIncludes: {
    "/**/*": ["./prisma/demo.db"],
  },
  experimental: {
    serverActions: { bodySizeLimit: "2mb" },
  },
};

export default nextConfig;
