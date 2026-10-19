/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    instrumentationHook: true,
  },
  webpack: (config) => {
    // 通知模板作为字符串内联进 bundle，避免边缘运行时依赖 fs
    config.module.rules.push({
      test: /template[\\/].+\.(html|md)$/,
      type: 'asset/source',
    });
    return config;
  },
};

export default nextConfig;
