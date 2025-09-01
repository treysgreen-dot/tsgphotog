/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: { unoptimized: true },

  // If you want static export instead of the Netlify Next.js plugin:
  // output: "export",
};

module.exports = nextConfig;