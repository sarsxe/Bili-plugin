import { __, pollMap, TempE, CONSTANTS, appKey, appSecret, appheaders } from "./constants.js"
import { createHash } from "node:crypto";
import Qrcode from "qrcode";
import sharp from "sharp";
import config from "../../Config.js";
import { HttpsProxyAgent } from "https-proxy-agent"

export default {
    async replyvideo(userCookies, aid, msg) {
        const params = {
            access_key: userCookies.access_token,
            build: "8020300",
            c_locale: "zh_CN",
            channel: "yingyongbao",
            disable_rcmd: "0",
            from_spmid: "tm.recommend.0.0",
            goto: "vertical_av",
            has_vote_option: "false",
            message: msg,
            mobi_app: "android",
            oid: aid,
            ordering: "heat",
            plat: "2",
            platform: "android",
            s_locale: "zh_CN",
            scene: "main",
            spmid: "main.ugc-video-detail-vertical.0.0",
            statistics: JSON.stringify({
                appId: 1,
                platform: 3,
                version: "8.2.0",
                abtest: ""
            }),
            sync_to_dynamic: "false",
            track_id: "all_49.router-pegasus-1914948-cd87cf9bc-rhz8m.1737638175528.728",
            ts: Math.floor(Date.now() / 1000),
            type: "1"
        };
    
        return this._fetchRequest({
            url: CONSTANTS.replyApiUrl,
            method: 'POST',
            params,
            extraHeaders: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
    },

    async unfavvideo(userCookies, aid) {
        const params = {
            access_key: userCookies.access_token,
            build: 8020300,
            c_locale: 'zh_CN',
            channel: 'yingyongbao',
            disable_rcmd: 0,
            mobi_app: 'android',
            platform: 'android',
            rid: aid,
            s_locale: 'zh_CN',
            statistics: JSON.stringify({
                appId: 1,
                platform: 3,
                version: '8.2.0',
                abtest: ''
            }),
            ts: Math.floor(Date.now() / 1000),
            type: 2
        };
    
        return this._fetchRequest({
            url: CONSTANTS.unfavApiUrl,
            method: 'POST',
            params,
            extraHeaders: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
    },
    
    async favvideo(userCookies, aid) {
        const params = {
            access_key: userCookies.access_token,
            add_media_ids: "0",
            build: "8020300",
            c_locale: "zh_CN",
            channel: "yingyongbao",
            del_media_ids: "",
            disable_rcmd: "0",
            extra: JSON.stringify({
                item_id: aid,
                from_spmid: "tm.recommend.0.0",
                spmid: "main.ugc-video-detail-vertical.0.0",
                track_id: "story_20.router-story-1901288-5ccc768c7f-g48sm.1737775288293.986",
                goto: "vertical_av"
            }),
            from: "",
            mobi_app: "android",
            platform: "android",
            resources: `${aid}:2`,
            s_locale: "zh_CN",
            statistics: JSON.stringify({
                appId: 1,
                platform: 3,
                version: "8.2.0",
                abtest: ""
            }),
            ts: Math.floor(Date.now() / 1000)
        };
    
        return this._fetchRequest({
            url: CONSTANTS.favApiUrl,
            method: 'POST',
            params,
            extraHeaders: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
    },
    
    async triplevideo(userCookies, aid) {
        const params = {
            access_key: userCookies.access_token,
            aid: aid,
            build: 8020300,
            c_locale: 'zh_CN',
            channel: 'yingyongbao',
            disable_rcmd: 0,
            from: 7,
            from_spmid: 'tm.recommend.0.0',
            goto: 'vertical_av',
            mobi_app: 'android',
            platform: 'android',
            s_locale: 'zh_CN',
            source: 'view_vvoucher',
            spmid: 'main.ugc-video-detail-vertical.0.0',
            statistics: JSON.stringify({
                appId: 1,
                platform: 3,
                version: '8.2.0',
                abtest: ''
            }),
            token: '',
            track_id: 'all_49.router-pegasus-1914948-cd87cf9bc-rhz8m.1737638175528.728',
            ts: Math.floor(Date.now() / 1000)
        };
    
        return this._fetchRequest({
            url: CONSTANTS.tripleUrl,
            method: 'POST',
            params,
            extraHeaders: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
    },
    
    async dislikevideo(userCookies, aid) {
        const params = {
            access_key: userCookies.access_token,
            aid: aid,
            build: "8020300",
            c_locale: "zh_CN",
            channel: "yingyongbao",
            disable_rcmd: "0",
            dislike: "0",
            from: "7",
            from_spmid: "tm.recommend.0.0",
            mobi_app: "android",
            platform: "android",
            s_locale: "zh_CN",
            spmid: "united.player-video-detail.0.0",
            statistics: JSON.stringify({
                appId: 1,
                platform: 3,
                version: "8.2.0",
                abtest: ""
            }),
            ts: Math.floor(Date.now() / 1000)
        };
    
        return this._fetchRequest({
            url: CONSTANTS.dislikeApiUrl,
            method: 'POST',
            params,
            extraHeaders: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
    },
    
    async likevideo(userCookies, aid, like = 1) {
        const params = {
            access_key: userCookies.access_token,
            aid: aid,
            build: '8020300',
            c_locale: 'zh_CN',
            channel: 'yingyongbao',
            disable_rcmd: '0',
            from: '7',
            from_spmid: 'tm.recommend.0.0',
            goto: 'vertical_av',
            like: like,
            mobi_app: 'android',
            ogv_type: '0',
            platform: 'android',
            s_locale: 'zh_CN',
            source: 'view_vvoucher',
            spmid: 'main.ugc-video-detail-vertical.0.0',
            statistics: JSON.stringify({
                appId: 1,
                platform: 3,
                version: '8.2.0',
                abtest: ''
            }),
            token: '',
            track_id: 'all_49.router-pegasus-1914948-cd87cf9bc-xvjrp.1737546540957.109',
            ts: Math.floor(Date.now() / 1000)
        };
    
        return this._fetchRequest({
            url: CONSTANTS.likeApiUrl,
            method: 'POST',
            params,
            extraHeaders: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
    },
}
