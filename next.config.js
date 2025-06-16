
// This file is configured to be valid JavaScript (ES module).
// TypeScript-specific syntax has been removed.

const nextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.ubhotel.mn',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.trvl-media.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'company.e-mart.mn', // Added this new hostname
        port: '',
        pathname: '/**',
      }
    ],
  },
  experimental: {
    allowedDevOrigins: ['https://9003-firebase-studio-1749972376165.cluster-sumfw3zmzzhzkx4mpvz3ogth4y.cloudworkstations.dev'],
  },
};

export default nextConfig;
