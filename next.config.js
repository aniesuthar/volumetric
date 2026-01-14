/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || []
      config.externals.push({
        canvas: 'commonjs canvas',
      })

      // Ignore pdf-parse test data files
      config.module = config.module || {}
      config.module.rules = config.module.rules || []
      config.module.rules.push({
        test: /\.pdf$/,
        use: 'null-loader'
      })
    }

    // Add fallback for fs module (required by pdf-parse)
    config.resolve = config.resolve || {}
    config.resolve.fallback = config.resolve.fallback || {}
    config.resolve.fallback.fs = false

    return config
  },
}

module.exports = nextConfig
