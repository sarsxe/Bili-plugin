import { __, pollMap, TempE, CONSTANTS, appKey, appSecret, appheaders } from "./constants.js"
import { createHash } from "node:crypto";
import Qrcode from "qrcode";
import sharp from "sharp";
import config from "../../Config.js";
import { HttpsProxyAgent } from "https-proxy-agent"

export default {
    async getupinfo(mids, userCookies) {
            const params = {
                _device: "android",
                _hwid: "e0l9GCEVJB15HSUTIUN1RQVLH1d6O3VFdQ",
                access_key: userCookies.access_token,
                appkey: "1d8b6e7d45233436",
                build: "8020300",
                c_locale: "zh_CN",
                channel: "yingyongbao",
                disable_rcmd: "0",
                mobi_app: "android",
                platform: "android",
                s_locale: "zh_CN",
                src: "yingyongbao",
                statistics: '{"appId":1,"platform":3,"version":"8.2.0","abtest":""}',
                style: "16",
                trace_id: "20250203224200010",
                ts: Math.floor(Date.now() / 1000),
                uids: mids,
                version: "8.2.0.8020300"
            };
            return this._fetchRequest({
                url: CONSTANTS.userinfoApiUrl,
                method: 'GET',
                params,
              })
    },

    async myinfo(userCookies) {
        const headers = await this.getwebheaders(userCookies);
        return this._fetchRequest({
            url: CONSTANTS.myinfoApiUrl,
            method: 'GET',
            extraHeaders: headers,
            needSign: false
        });
    },
    
    async myinfo2(userCookies) {
        const params = {
            access_key: userCookies.access_token,
            build: "8020300",
            buvid: "XU4C85241BF18FBC9C5C20CA1D08F38937711",
            c_locale: "zh_CN",
            channel: "yingyongbao",
            disable_rcmd: "0",
            local_id: "XU4C85241BF18FBC9C5C20CA1D08F38937711",
            mobi_app: "android",
            platform: "android",
            s_locale: "zh_CN",
            statistics: JSON.stringify({
                appId: 1,
                platform: 3,
                version: "8.2.0",
                abtest: ""
            }),
            ts: Math.floor(Date.now() / 1000),
        };
    
        return this._fetchRequest({
            url: CONSTANTS.info2ApiUrl,
            method: 'GET',
            params,
            signKey: "783bbb7264451d82",
            signSecret: "2653583c8873dea268ab9386918b1d65"
        })
    },

    async exp_log2(userCookies) {
        const headers = await this.getwebheaders(userCookies);
        return this._fetchRequest({
            url: CONSTANTS.explog2ApiUrl,
            method: 'GET',
            extraHeaders: headers,
            needSign: false
        });
    },
    
    async space(mid, userCookies) {
        const params = {
            access_key: userCookies.access_token || '114514',
            build: '8020300',
            c_locale: 'zh_CN',
            channel: 'yingyongbao',
            disable_rcmd: 0,
            fnval: 912,
            fnver: 0,
            force_host: 0,
            fourk: 1,
            from: 0,
            local_time: Math.floor(Date.now() / 1000),
            mobi_app: 'android',
            platform: 'android',
            player_net: 1,
            qn: 32,
            qn_policy: 1,
            s_locale: 'zh_CN',
            statistics: JSON.stringify({
                "appId": 1,
                "platform": 3,
                "version": "8.2.0",
                "abtest": ""
            }),
            ts: Math.floor(Date.now() / 1000),
            vmid: mid,
            voice_balance: 1
        };
    
        return this._fetchRequest({
            url: CONSTANTS.spaceApiUrl,
            method: 'GET',
            params
        });
    },

    async getwebheaders(userCookies) {
        return {
            'User-Agent': 'Mozilla/5.0 BiliDroid/8.2.0 (bbcallen@gmail.com) os/android model/24031PN0DC mobi_app/android build/8020300 channel/yingyongbao innerVer/8020300 osVer/12 network/2',
            'Host': 'api.bilibili.com',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cookie': `SESSDATA=${userCookies.SESSDATA}`,
            'Accept': '*/*',
            'Connection': 'keep-alive',
            'Referer': 'https://www.bilibili.com/',
            'Origin': 'https://www.bilibili.com'
        };
    },

}
