import { AuthUtils } from "@/components/AuthUtils";
import { ResponseUtils } from "@/components/ResponseUtils";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const res = await AuthUtils.checkLogin(request);
    if (res instanceof Response) {
        return ResponseUtils.needLogin();
    }

    if (!res.username) {
        return ResponseUtils.badToken("No aud claim.");
    }

    return ResponseUtils.successJson("Login Success");
}