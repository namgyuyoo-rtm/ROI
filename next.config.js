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
            // WARNING: Allowing all origins ('*') can be a security risk (clickjacking).
            // Only use this if you understand the implications.
            value: "frame-ancestors '*'",
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