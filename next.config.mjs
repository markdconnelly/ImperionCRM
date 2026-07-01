/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Keep these server-only packages out of the webpack bundle: `pg` uses dynamic
  // requires and `@azure/identity` pulls native/optional deps. Traced into the
  // standalone node_modules and required at runtime instead.
  serverExternalPackages: ["pg", "@azure/identity"],
  // Self-contained server build for Azure App Service: emits .next/standalone
  // with a bundled server.js + traced node_modules. Avoids relying on
  // `npm start` / node_modules symlinks / Oryx at container startup.
  output: "standalone",
  // Bare /story serves the public build-story page (#248); public/ files don't
  // get directory-index resolution on their own.
  async rewrites() {
    return [{ source: "/story", destination: "/story/index.html" }];
  },
  // The orchestrator front door was renamed /jarvis → /nova (Jarvis→Nova, #1672).
  // Permanently redirect the old slug so bookmarks and deep links keep working.
  async redirects() {
    return [{ source: "/jarvis", destination: "/nova", permanent: true }];
  },
};

export default nextConfig;
