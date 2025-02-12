module.exports = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'github.com',
                port: '',
                pathname: '/F0rgenet/typst-g7-32/raw/preview/**',
                search: '',
            },
        ],
    },
    webpack: (config) => {
        config.resolve.alias.canvas = false;
        return config;
    },
}