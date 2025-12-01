/** @type {import('next').NextConfig} */
const nextConfig = {
  // Transpile these packages for client-side usage
  transpilePackages: ['react-map-gl', 'mapbox-gl'],
  // Note: Cannot use same packages in both transpilePackages and serverExternalPackages
  // Mapbox packages need to be transpiled for browser compatibility
}

module.exports = nextConfig
