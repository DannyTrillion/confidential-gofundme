/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer, webpack }) => {
    config.experiments = { ...config.experiments, asyncWebAssembly: true, layers: true };
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        net: false,
        tls: false,
      };
    }
    config.externals = config.externals || [];
    if (Array.isArray(config.externals)) {
      config.externals.push("pino-pretty", "encoding");
    }
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^(@react-native-async-storage\/async-storage|pino-pretty)$/,
      }),
    );
    return config;
  },
};

export default nextConfig;
