/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        // Apply these headers to all routes in your application.
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            // Allow framing from self and framer domains
            value: "frame-ancestors 'self' https://*.framer.app https://*.framer.media;",
          },
          // X-Frame-Options is deprecated by CSP frame-ancestors, but some older browsers might still look for it.
          // Vercel might remove this automatically if CSP frame-ancestors is set, but being explicit can help.
          // {
          //   key: 'X-Frame-Options',
          //   value: 'ALLOW-FROM https://*.framer.app',
          // }
        ],
      },
    ];
  },
};

module.exports = nextConfig; 