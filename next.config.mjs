/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Self-contained server build for Azure App Service: emits .next/standalone
  // with a bundled server.js + traced node_modules. Avoids relying on
  // `npm start` / node_modules symlinks / Oryx at container startup.
  output: "standalone",
};

export default nextConfig;
