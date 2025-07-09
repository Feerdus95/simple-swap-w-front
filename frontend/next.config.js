/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable React's Strict Mode in development to prevent double rendering
  // which can cause issues with some Web3 libraries
  reactStrictMode: process.env.NODE_ENV !== 'production',
  
  // Configure images if needed
  images: {
    domains: ['localhost', 'simpleswap-dex.vercel.app'],
  },
  
  // Add security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ]
  },
  
  // Add environment variables that should be exposed to the browser
  env: {
    NEXT_PUBLIC_INFURA_API_KEY: process.env.NEXT_PUBLIC_INFURA_API_KEY,
    NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
  },
  
  // Add webpack configuration if needed
  webpack: (config, { isServer }) => {
    // Fixes npm packages that depend on `node:` protocol (not compatible with webpack 5)
    config.resolve.fallback = { 
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    
    return config;
  },
}

module.exports = nextConfig
