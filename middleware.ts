import { NextRequest, NextResponse } from "next/server";
import { ResponseUtils } from "./components/ResponseUtils";

const allowedPathNames = ["/music/get", "/music/get/info", "/net/proxy", "/favicon.ico", "/_next/.*"]

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    // console.log(pathname + " is being requested")

    // 把pathname ? 后面的全砍掉
    const cleanPathname = pathname.split("?")[0];
    if (!allowedPathNames.some(allowedPath => new RegExp(`^${allowedPath}(/|\\?)?(\\?[^/]+)?$`).test(cleanPathname))) {
        return ResponseUtils.wrong("pathname. Nothing here.");
    }
    return NextResponse.next();
}