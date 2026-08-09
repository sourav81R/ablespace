/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

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
