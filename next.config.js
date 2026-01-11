/** @type {import('next').NextConfig} */
const nextConfig = {
  // react-pdf用: Next.js 15未満ではswcMinifyをfalseに
  swcMinify: false,
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // react-pdf-highlighter用: ESMモジュールのトランスパイル
  transpilePackages: ['react-pdf-highlighter'],
  webpack: (config, { isServer }) => {
    // react-pdf用のcanvas設定
    config.resolve.alias.canvas = false

    // ESMモジュールの解決設定
    config.resolve.extensionAlias = {
      '.js': ['.js', '.ts', '.tsx'],
      '.mjs': ['.mjs'],
    }

    // pdfjs-distのESMをCommonJSとして扱う
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      }
    }

    return config
  },
}

module.exports = nextConfig
