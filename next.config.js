module.exports = {
    images: {
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
            }
        ],
    },
    turbopack: {},
    webpack: (config) => {
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
            }
        return config;
    },
    serverExternalPackages: ['pdfjs-dist'],
}
