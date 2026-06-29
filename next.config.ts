import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Ensure Yjs and related packages are transpiled consistently by Turbopack.
  // This prevents module duplication issues that cause "Unexpected end of array"
  // errors when Yjs's internal state is corrupted by multiple evaluations.
  transpilePackages: [
    "yjs",
    "y-protocols",
    "lib0",
    "y-prosemirror",
    "y-indexeddb",
    "@tiptap/extension-collaboration",
    "@tiptap/extension-collaboration-cursor",
    "@tiptap/y-tiptap",
  ],
};

export default nextConfig;
