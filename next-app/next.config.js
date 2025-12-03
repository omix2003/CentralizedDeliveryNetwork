/** @type {import('next').NextConfig} */
const nextConfig = {
  // Transpile these packages for client-side usage
  transpilePackages: ['react-map-gl', 'mapbox-gl'],
  // Note: Cannot use same packages in both transpilePackages and serverExternalPackages
  // Mapbox packages need to be transpiled for browser compatibility
  
  images: {
    remotePatterns: [
      // Development - localhost backend
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '5000',
        pathname: '/uploads/**',
      },
      // Production - any HTTPS backend
      {
        protocol: 'https',
        hostname: '**',
        pathname: '/uploads/**',
      },
      // Development - any HTTP backend (for other dev environments)
      {
        protocol: 'http',
        hostname: '**',
        pathname: '/uploads/**',
      },
    ],
  },
}

module.exports = nextConfig
