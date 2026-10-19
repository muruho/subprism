/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    instrumentationHook: true,
    outputFileTracingIncludes: {
      '/api/**/*': ['./template/**/*', './locales/**/*'],
      '/sub/**/*': ['./template/**/*', './locales/**/*'],
    },
  },
};

export default nextConfig;
