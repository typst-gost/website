import { createMDX } from "fumadocs-mdx/next";
import remarkTypstPath from "./src/lib/remark-typst-path.js";

const withMDX = createMDX({
  mdxOptions: {
    remarkPlugins: [remarkTypstPath],
    development: process.env.NODE_ENV === "development",
  },
});

/** @type {import('next').NextConfig} */
const config = {
    output: "standalone",
    images: {
        unoptimized: true,
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'github.com',
                port: '',
                pathname: '/typst-gost/modern-g7-32/**',
                search: '',
            },
            {
                protocol: 'https',
                hostname: 'raw.githubusercontent.com',
                port: '',
                pathname: '/typst-gost/examples/**',
                search: '',
            },
            {
                protocol: 'https',
                hostname: 'github.com',
                port: '',
                pathname: '/*.png',
                search: '',
            },
            {
                protocol: 'https',
                hostname: 'avatars.githubusercontent.com',
                port: '',
                pathname: '/u/*',
            }
        ],
    },
    turbopack: {},
    webpack: (config, { isServer }) => {
        config.module.rules.push({
            test: /\.svg$/,
            use: ["@svgr/webpack"],
        });
        if (!isServer) {
            config.resolve.fallback = {
                ...config.resolve.fallback,
                canvas: false,
            };
        } else {
            config.externals.push({
                canvas: 'canvas',
            });
            config.externals.push({
              "@myriaddreamin/typst-ts-node-compiler": "@myriaddreamin/typst-ts-node-compiler",
            });
        }
        return config;
    },
    serverExternalPackages: ["pdfjs-dist"],
    reactStrictMode: true,
    async headers() {
        return[
            {
                source: '/wasm/:path*',
                headers:[{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
            },
            {
                source: '/pdfjs/:path*',
                headers:[{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
            },
        ];
    },
    async rewrites() {
        return [
        {
            source: '/docs/:path*.mdx',
            destination: '/llms.mdx/docs/:path*',
        },
        ];
    },
};

export default withMDX(config);
