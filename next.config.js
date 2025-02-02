/** @type {import('next').NextConfig} */
const nextConfig = {
    async headers() {
        return [
            {
                source: '/:anything*',
                headers: [
                    {
                        key: 'Access-Control-Allow-Origin',
                        value: '*',
                    },
                    {
                        key: 'Access-Control-Allow-Headers',
                        value: '*',
                    },
                    {
                        key: 'Access-Control-Expose-Headers',
                        value: 'Content-Length, Content-Range',
                    }
                ],
            }
        ]
    },
    output: "standalone"
}



module.exports = nextConfig
