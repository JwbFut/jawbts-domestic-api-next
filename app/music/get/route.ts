import { AuthUtils } from "@/components/AuthUtils";
import { BiliBiliUtils } from "@/components/BiliBiliUtils";
import { ErrorUtils } from "@/components/ErrorUtils";
import { ResponseUtils } from "@/components/ResponseUtils";
import next from "next";

export const dynamic = 'force-dynamic';

function getMaxBrandWidthUrl(data: any) {
    if (!data['data']['dash']['audio']) throw new Error("No audio data found");
    if (!data['data']['dash']['audio'].length) throw new Error("No audio data found");
    let max_width = 0;
    let max_url = "";
    for (let i = 0; i < data['data']['dash']['audio'].length; i++) {
        if (data['data']['dash']['audio'][i]['bandwidth'] > max_width) {
            max_width = data['data']['dash']['audio'][i]['bandwidth'];
            max_url = data['data']['dash']['audio'][i]['baseUrl'];
        }
    }
    return max_url;
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token")
    if (!token) return ResponseUtils.needLogin();
    const login = await AuthUtils.checkToken(token);
    if (login instanceof Response) return login;

    const id = searchParams.get('id');
    if (!id) return ResponseUtils.missing("Param: id");

    let header_with_ua = new Headers();
    header_with_ua.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36 Edg/127.0.0.0');

    if (id.startsWith("B")) {
        let headers = request.headers;
        headers.set('Referer', 'https://bilibili.com/video/' + id.slice(1));
        headers.set('Origin', 'https://bilibili.com');
        headers.set('Host', 'bilibili.com');
        headers.delete('Authorization');
        headers.set('Accept', '*/*');
        headers.set('Accept-Encoding', 'identity');
        headers.set('Accept-Language', 'zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6');
        headers.set('Sec-Ch-Ua', '"Not)A;Brand";v="99", "Microsoft Edge";v="127", "Chromium";v="127"');
        headers.set('priority', 'u=1, i');
        headers.set('Sec-Ch-Ua-Mobile', '?0');
        headers.set('Sec-Ch-Ua-Platform', '"Windows');
        headers.set('Sec-Fetch-Dest', 'empty');
        headers.set('Sec-Fetch-Mode', 'cors');
        headers.set('Sec-Fetch-Site', 'cross-site');
        headers.set('Sec-Fetch-User', '?1');
        headers.set('Upgrade-Insecure-Requests', '1');
        headers.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36 Edg/127.0.0.0');

        // let range = headers.get('Range')?.replace("bytes=", "");
        // if (range) {
        //     let rs = range.split("-");
        //     // console.log(rs)
        //     let end = Number.parseInt(rs[0]) + 300000;
        //     if (rs.length == 2 && rs[1] != '') {
        //         end = Number.parseInt(rs[1]);
        //     }
        //     if (rs[0] == "0") {
        //         end = 2145;
        //     } else {
        //         end = Math.min(end, Number.parseInt(rs[0]) + 300000)
        //     }
        //     headers.set('Range', `bytes=${rs[0]}-${end}`);
        //     // console.log(headers.get('Range'));
        // }

        let debug_url = "";
        let audio_url;
        const id_r = id.slice(1).split("_");
        try {
            // 缓存2分钟
            debug_url = 'https://www.bilibili.com/video/' + id_r[0] + id_r[1] ? ("?p=" + id_r[1]) : "";
            const response = await fetch('https://www.bilibili.com/video/' + id_r[0] + (id_r[1] ? ("?p=" + id_r[1]) : ""), { next: { revalidate: 120 }, headers: header_with_ua });
            const text = await response.text();
            const res = text.match(/<script>window.__playinfo__=(.*?)<\/script>/)
            if (!res || !res[1]) {
                // 有些地方没有playinfo, 需要动用另一个接口来拿地址

                // 注意, 缓存一天
                debug_url = 'https://api.bilibili.com/x/player/pagelist?bvid=' + id_r[0];
                const response_cid = await fetch('https://api.bilibili.com/x/player/pagelist?bvid=' + id_r[0], { next: { revalidate: 86400 }, headers: header_with_ua });
                const response_cid_json = await response_cid.json();
                const p = id_r[1] ? Number.parseInt(id_r[1]) : 0;
                const params = `bvid=${id_r[0]}&cid=${response_cid_json['data'][p]["cid"]}&qn=0&fnver=0&fnval=4048&fourk=1&gaia_source=&from_client=BROWSER&voice_balance=1&web_location=1315873&wts=${Date.now() / 1e3}`;

                // 缓存5分钟
                debug_url = "https://api.bilibili.com/x/player/playurl?**WBI**";
                const response_play_info = await fetch("https://api.bilibili.com/x/player/playurl?" + await BiliBiliUtils.encWbi(params), { next: { revalidate: 300 }, headers: header_with_ua });
                const response_play_info_json = await response_play_info.json();

                audio_url = getMaxBrandWidthUrl(response_play_info_json);
            } else {
                // 有playinfo的情况

                const res_js = JSON.parse(res[1]);
                audio_url = getMaxBrandWidthUrl(res_js);
            }
        } catch (e) {
            ErrorUtils.log(e as Error);
            console.log("URL: " + debug_url);
            return ResponseUtils.serverError((e as Error).message);
        }

        let response_music;

        try {
            response_music = await fetch(audio_url, {
                headers: headers,
                cache: 'no-cache'
            });
            if (response_music.status >= 300 || response_music.status < 200) {
                await new Promise(resolve => setTimeout(() => resolve, 1000));
                response_music = await fetch(audio_url, {
                    headers: headers,
                    cache: 'no-cache'
                });
            }
        } catch (e) {
            ErrorUtils.log(e as Error);
            console.log("URL: " + audio_url);
            return ResponseUtils.serverError((e as Error).message);
        }

        let rebuilt_reponse = new Response(response_music.body);
        response_music.headers.forEach((value, key) => {
            rebuilt_reponse.headers.set(key, value);
        });
        rebuilt_reponse.headers.delete("access-control-allow-origin");
        rebuilt_reponse.headers.set("Content-Type", "application/octet-stream");

        return rebuilt_reponse;
    } else {
        return ResponseUtils.bad("id");
    }
}