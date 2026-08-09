/**
 * Dev and production write to separate directories.
 *
 * They share `.next` by default, so running `next build` while `next dev` is
 * up replaces the dev server's chunks with production ones. The dev server
 * keeps serving HTML that references the chunks it built, every
 * `/_next/static/...` request 404s, and the page renders blank — with no error
 * pointing at the cause. Separating them makes that collision impossible.
 */
const distDir = process.env.NODE_ENV === 'development' ? '.next-dev' : '.next';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  distDir,

  // The shared package ships TypeScript source rather than a build artefact for
  // the web app, so Next must compile it alongside the app's own code.
  transpilePackages: ['@ablespace/shared'],

  eslint: {
    dirs: ['src'],
  },

  images: {
    remotePatterns: [
      // Google account avatars, returned in the Firebase token's picture claim.
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
};

export default nextConfig;
