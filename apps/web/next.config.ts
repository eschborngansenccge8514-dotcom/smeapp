import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    '@google-shopping/products',
    '@google-shopping/datasources',
    'google-auth-library'
  ],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'loicwawqjiboyjysljcv.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default nextConfig;
