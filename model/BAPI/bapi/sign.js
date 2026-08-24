import { __, pollMap, TempE, CONSTANTS, appKey, appSecret, appheaders } from "./constants.js"
import { createHash } from "node:crypto";
import Qrcode from "qrcode";
import sharp from "sharp";
import config from "../../Config.js";
import { HttpsProxyAgent } from "https-proxy-agent"

export default {
    async shareVideo(aid, userCookies) {
        const params = {
            access_key: userCookies.access_token,
            build: "8020300",
            c_locale: "zh_CN",
            channel: "yingyongbao",
            disable_rcmd: "0",
            from_spmid: "tm.recommend.0.0",
            mobi_app: "android",
            object_extra_fields: JSON.stringify({
                goto: "vertical_av",
                track_id: "all_49.router-pegasus-1914948-cd87cf9bc-rhz8m.1737638175528.728"
            }),
            oid: aid,
            panel_type: "1",
            platform: "android",
            s_locale: "zh_CN",
            share_channel: "biliIm",
            share_id: "main.ugc-video-detail-vertical.0.0.pv",
            share_origin: "story",
            share_session_id: "d4a6cffa-4988-4078-b2b9-b6ec5b2c6177",
            sid: "27882881279",
            spm_id: "main.ugc-video-detail-vertical.0.0",
            statistics: JSON.stringify({
                appId: 1,
                platform: 3,
                version: "8.2.0",
                abtest: ""
            }),
            success: "true",
            ts: Math.floor(Date.now() / 1000),
        };
    
        return this._fetchRequest({
            url: CONSTANTS.shareApiUrl,
            method: 'POST',
            params,
            extraHeaders: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
    },

    async reportWatch(aid, cid, userCookies, time = Math.floor(Math.random() * 91) + 10) {
        const watchTime = Math.min(Math.max(time, 10), 100);
        
        const params = {
            access_key: userCookies.access_token,
            aid: aid,
            cid: cid,
            progress: watchTime,
            build: "8020300",
            c_locale: "zh_CN",
            channel: "yingyongbao",
            scene: 'front',
            statistics: JSON.stringify({
                appId: 1,
                platform: 3,
                version: "8.2.0",
                abtest: ""
            }),
            ts: Math.floor(Date.now() / 1000),
            type: '3',
            platform: 'android',
            mobi_app: 'android_i',
            disable_rcmd: '0',
        };
    
        return this._fetchRequest({
            url: CONSTANTS.reportApiUrl,
            method: 'POST',
            params,
            extraHeaders: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
    },

    async getExperience(userCookies) {
        const headers = await this.getwebheaders(userCookies);
        return this._fetchRequest({
            url: CONSTANTS.experienceApiUrl,
            method: 'POST',
            bodyParams: { csrf: userCookies.csrf },
            extraHeaders: headers,
            needSign: false
        });
    },
    
    async getCoupons(userCookies, type = 1) {
        const headers = await this.getwebheaders(userCookies);
        return this._fetchRequest({
            url: CONSTANTS.privUrl,
            method: 'POST',
            bodyParams: {
                type: String(type),
                csrf: userCookies.csrf
            },
            extraHeaders: headers,
            needSign: false
        });
    },
    
    async shareManhua(userCookies) {
        const headers = await this.getwebheaders(userCookies);
        return this._fetchRequest({
            url: CONSTANTS.mangaShareUrl,
            method: 'POST',
            bodyParams: { platform: 'android' },
            extraHeaders: headers,
            needSign: false
        });
    },
    
    async signManhua(userCookies) {
        const headers = await this.getwebheaders(userCookies);
        return this._fetchRequest({
            url: CONSTANTS.mangaClockInUrl,
            method: 'POST',
            bodyParams: { platform: 'android' },
            extraHeaders: headers,
            needSign: false
        });
    },

    async addCoin(aid, userCookies, coin = 1, selectLike = 1) {
        const params = {
            access_key: userCookies.access_token,
            aid: aid,
            avtype: 1,
            build: 8020300,
            c_locale: 'zh_CN',
            channel: 'yingyongbao',
            disable_rcmd: 0,
            from: 7,
            from_spmid: 'tm.recommend.0.0',
            goto: 'vertical_av',
            mobi_app: 'android',
            multiply: coin,
            platform: 'android',
            s_locale: 'zh_CN',
            select_like: selectLike,
            source: '',
            spmid: 'main.ugc-video-detail-vertical.0.0',
            statistics: JSON.stringify({
                appId: 1,
                platform: 3,
                version: '8.2.0',
                abtest: ''
            }),
            token: '',
            track_id: 'all_49.router-pegasus-1914948-cd87cf9bc-xvjrp.1737546540957.109',
            ts: Math.floor(Date.now() / 1000),
            upid: 0
        };
    
        return this._fetchRequest({
            url: CONSTANTS.addCoinApiUrl,
            method: 'POST',
            params,
            extraHeaders: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
    },
    
    async getFeed(userCookies) {
        const params = {
            access_key: userCookies.access_token || '114514',
            aid: "",
            auto_play: "0",
            build: "8020300",
            bvid: "",
            c_locale: "zh_CN",
            channel: "yingyongbao",
            cid: "",
            contain: "false",
            creative_id: "0",
            device_name: "2206123SC",
            disable_rcmd: "0",
            display_id: "1",
            epid: "0",
            feed_status: "0",
            fnval: "912",
            fnver: "0",
            force_host: "0",
            fourk: "1",
            from: "6",
            from_spmid: "main.homepage.avatar.0",
            goto: "",
            mobi_app: "android",
            network: "wifi",
            ogv_style: "0",
            platform: "android",
            player_net: "1",
            pull: "1",
            qn: "32",
            request_from: "1",
            s_locale: "zh_CN",
            spmid: "main.switch-mode.story.0",
            statistics: '{"appId":1,"platform":3,"version":"8.2.0","abtest":""}',
            story_param: "",
            trackid: "",
            ts: Math.floor(Date.now() / 1000),
            video_mode: "1",
            voice_balance: "1"
        };
    
        return this._fetchRequest({
            url: CONSTANTS.feed2ApiUrl,
            method: 'GET',
            params
        });
    },

}
