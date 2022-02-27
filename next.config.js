/** @type {import('next').NextConfig} */

const nextConfig = {
  reactStrictMode: true,
  async redirects () {
    return [
      {
        source: '/',
        destination: '/thoughts',
        permanent: true,
      },
    ]
  },
}

module.exports = nextConfig
