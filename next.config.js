/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        // Apply these headers to all routes in your application.
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            // Allow embedding from Framer subdomains and the specific RTM POC domain.
            value: "frame-ancestors https://*.framer.app https://*.online-poc.rtm.ai;",
          },
          // X-Frame-Options is deprecated by CSP frame-ancestors, but some older browsers might still look for it.
          // Vercel might remove this automatically if CSP frame-ancestors is set, but being explicit can help.
          // {
          //   key: 'X-Frame-Options',
          //   // Use SAMEORIGIN or DENY, or specific URI with ALLOW-FROM (limited support)
          //   value: 'SAMEORIGIN', // or 'DENY' or 'ALLOW-FROM https://example.com'
          // }
        ],
      },
    ];
  },
};

module.exports = nextConfig; 