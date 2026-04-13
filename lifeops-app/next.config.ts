import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Phase 15.B: pdf-parse (and its pdfjs-dist dep) must not be webpack-bundled.
  // Bundling triggers a test-fixture require that webpack can't resolve.
  // Marking as external lets Node.js load it natively, avoiding the issue.
  serverExternalPackages: ['pdf-parse', 'pdfjs-dist'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
}

export default nextConfig
