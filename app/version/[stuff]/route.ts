import { ResponseUtils } from "@/components/ResponseUtils"

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

const stuffs: { [key: string]: any } = {
    noglerr: {
        lowestSafeVersion: "1.0.8",
        // checkUrl: "https://baidu.com",
        branches: {
            "fabric-1.17.x": {
                latestVersion: "1.0.9",
                downloadUrl: "https://modrinth.com/mod/noglerr/versions#all-versions"
            },
            "fabric-1.21": {
                latestVersion: "1.0.9",
                downloadUrl: "https://modrinth.com/mod/noglerr/versions#all-versions"
            }
        }
    }
};

export async function GET(
    request: Request,
    { params }: { params: { stuff: string } }
) {
    const stuff = params.stuff;
    if (stuffs[stuff] == undefined) {
        return ResponseUtils.notFound(stuff);
    }
    return ResponseUtils.successJson(stuffs[stuff]);
}