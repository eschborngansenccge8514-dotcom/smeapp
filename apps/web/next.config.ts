import type { NextConfig } from 'next'
import withBundleAnalyzer from '@next/bundle-analyzer'

const nextConfig: NextConfig = {
  // ─── External Packages ──────────────────────────────────────────────────
  serverExternalPackages: [
    '@google-shopping/products',
    '@google-shopping/datasources',
    'google-auth-library'
  ],

  // ─── Compiler ────────────────────────────────────────────────────────────
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
      ? { exclude: ['error', 'warn'] }
      : false,
  },

  // ─── Experimental ─────────────────────────────────────────────────────────
  experimental: {
    // Partial Pre-Rendering — static shell + dynamic streaming
    // Disabled due to build conflicts with route-level exports in Next.js 16
    cacheComponents: false,
    // Inline small CSS into HTML (avoids render-blocking link tags)
    inlineCss: true,
    // Optimise server actions bundle
    serverActions: { bodySizeLimit: '2mb' },
  },

  // Silence Turbopack vs Webpack conflict
  turbopack: {},

  // ─── Images ───────────────────────────────────────────────────────────────
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [375, 640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 365, // 1 year
    dangerouslyAllowSVG: false,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      { protocol: 'https', hostname: '**.mymarket.com' },
      { protocol: 'https', hostname: '**.supabase.co'  },
      { protocol: 'https', hostname: '**.supabase.in'  },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      // Allow any custom domain (for merchant logos served from their domain)
      { protocol: 'https', hostname: '**' },
    ],
  },
// ... remaining unchanged

  // ─── Headers ──────────────────────────────────────────────────────────────
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Security
          { key: 'X-DNS-Prefetch-Control',   value: 'on' },
          { key: 'X-Frame-Options',           value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options',    value: 'nosniff' },
          { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',        value: 'camera=(), microphone=(), geolocation=(self)' },
          // Compression hint
          { key: 'Vary', value: 'Accept-Encoding' },
        ],
      },
      // Static assets — 1 year immutable cache
      {
        source: '/_next/static/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      // Images — 30 day cache
      {
        source: '/_next/image(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=2592000, stale-while-revalidate=86400' },
        ],
      },
      // Fonts — 1 year
      {
        source: '/fonts/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      // API routes — no client cache, SWR allowed
      {
        source: '/api/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store' },
          { key: 'Access-Control-Allow-Origin',  value: '*.mymarket.com' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,OPTIONS' },
        ],
      },
    ]
  },

  // ─── Redirects ─────────────────────────────────────────────────────────────
  async redirects() {
    return [
      { source: '/home', destination: '/', permanent: true },
    ]
  },

  // ─── Webpack ───────────────────────────────────────────────────────────────
  webpack(config, { isServer, dev }) {
    // Remove Moment.js locale bloat
    const { IgnorePlugin } = require('webpack')
    config.plugins.push(
      new IgnorePlugin({
        resourceRegExp: /^\.\/locale$/,
        contextRegExp: /moment$/,
      })
    )

    if (!dev && !isServer) {
      // Split large vendor chunks
      config.optimization.splitChunks = {
        chunks: 'all',
        maxInitialRequests: 30,
        maxAsyncRequests: 30,
        minSize: 20000,
        cacheGroups: {
          framework: {
            name: 'framework',
            test: /[\\/]node_modules[\\/](react|react-dom|next|scheduler)[\\/]/,
            priority: 40,
            chunks: 'all',
          },
          supabase: {
            name: 'supabase',
            test: /[\\/]node_modules[\\/]@supabase[\\/]/,
            priority: 30,
            chunks: 'async',
          },
          commons: {
            name: 'commons',
            test: /[\\/]node_modules[\\/]/,
            minChunks: 2,
            priority: 20,
            reuseExistingChunk: true,
          },
        },
      }
    }

    return config
  },

  // ─── Output ────────────────────────────────────────────────────────────────
  output: 'standalone',    // Minimal Docker image
  poweredByHeader: false,  // Remove X-Powered-By header
  compress: true,          // Gzip responses
  generateEtags: true,
  reactStrictMode: true,

  // ─── Logging ───────────────────────────────────────────────────────────────
  logging: {
    fetches: { fullUrl: process.env.NODE_ENV === 'development' },
  },
}

const withAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

export default withAnalyzer(nextConfig)
