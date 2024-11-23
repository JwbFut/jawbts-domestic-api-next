import { ResponseUtils } from "./ResponseUtils";
import * as jose from "jose"

export const jwks = jose.createRemoteJWKSet(new URL(process.env.ORIGIN_URL + "/auth/keys"));

export class AuthUtils {
    static chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

    static generateState() {
        return this.generateRandomString(15);
    }

    static generateToken() {
        return this.generateRandomString(100);
    }

    static async hash(string: string, salt: string = "") {
        return Buffer.from(await crypto.subtle.digest("SHA-512", new TextEncoder().encode(string + salt))).toString("base64");
    }

    static generateRandomString(length: number) {
        let res = "";
        for (let i = 0; i < length; i++) {
            res += this.chars[crypto.getRandomValues(new Uint32Array(1))[0] % this.chars.length];
        }
        return res;
    }

    static async checkLogin(request: Request) {
        const auth = request.headers.get("Authorization");
        if (!auth) return ResponseUtils.needLogin();
        if (!auth.startsWith("Bearer ")) return ResponseUtils.badToken("Unsupported Token");

        return await this.checkToken(auth.substring(7))
    }

    static async checkToken(token: string) {
        try {
            const { payload } = await jose.jwtVerify(token, jwks, {
                issuer: 'jawbts-api'
            });
            if (!payload.scope) return ResponseUtils.badToken("Bad Token");;
            if (!(payload.scope instanceof Array)) return ResponseUtils.badToken("Bad Token");;
            return payload.scope.includes("api") ? { username: payload.aud } : ResponseUtils.badToken("Bad Token");;
        } catch(err) {
            if ((err as Error).message === '"exp" claim timestamp check failed') {
                return ResponseUtils.badToken("Token Expired");;
            }
            return ResponseUtils.badToken("Bad Token");;
        }
    }
}