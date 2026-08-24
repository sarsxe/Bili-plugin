import { __, pollMap, TempE, CONSTANTS, appKey, appSecret, appheaders } from "./constants.js"
import { createHash } from "node:crypto";
import Qrcode from "qrcode";
import sharp from "sharp";
import config from "../../Config.js";
import { HttpsProxyAgent } from "https-proxy-agent"

export default {
    async livesenddamu(userCookies, msg, roomid) {
        const baseParams = {
          access_key: userCookies.access_token,
          actionKey: 'appkey',
          appkey: appKey,
          build: '7750600',
          c_locale: 'zh_CN',
          channel: 'master',
          device: 'android',
          disable_rcmd: '0',
          mobi_app: 'android_i',
          platform: 'android',
          s_locale: 'zh_CN',
          statistics: '{"appId":1,"platform":3,"version":"8.2.0","abtest":""}',
          ts: Math.floor(Date.now() / 1000),
        };
    
        const bodyParams = {
          data_extend: '{"from_launch_id":"1000280","from_session_id":"2c2e89476541bffb108cffcfaf67c473_5d929793-fdbf-4db0-bdcf-a790613593f5","live_key":"581850624722422072","sub_session_key":"581850624722422072sub_time:1740924315"}',
          bubble: '0',
          msg_type: '0',
          room_type: '0',
          live_status: 'live',
          launch_id: '1000280',
          reply_attr: '0',
          reply_mid: '0',
          jumpfrom: '24000',
          cid: roomid,
          msg: msg,
          rnd: '874725357',
          mode: '1',
          pool: '0',
          type: 'json',
          av_id: '-99998',
          color: '16777215',
          fontsize: '25',
          bussiness_extend: '{"broadcast_type":"0","stream_scale":"2","watch_ui_type":"2"}',
          flow_extend: '{"position":"1","s_position":"1","slide_direction":"-99998"}',
          jumpfrom_extend: '4',
          screen_status: '2',
          session_id: '2c2e89476541bffb108cffcfaf67c473_5d929793-fdbf-4db0-bdcf-a790613593f5',
          dm_type: '0',
          playTime: '0.0'
        };
    
        return this._fetchRequest({
          url: CONSTANTS.danmuApiUrl,
          method: 'POST',
          params: baseParams,
          bodyParams: bodyParams,
          extraHeaders: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        })
      },

    async getlivefeed(userCookies) {
        const params = {
            access_key: userCookies.access_token,
            actionKey: "appkey",
            build: "8020300",
            c_locale: "zh_CN",
            channel: "yingyongbao",
            device: "android",
            device_name: "2206123SC",
            disable_rcmd: "0",
            https_url_req: "0",
            is_refresh: "0",
            login_event: "1",
            mobi_app: "android",
            module_select: "0",
            network: "wifi",
            out_ad_name: "",
            page: "1",
            platform: "android",
            qn: "0",
            relation_page: "1",
            s_locale: "zh_CN",
            scale: "hdpi",
            statistics: JSON.stringify({
                appId: 1,
                platform: 3,
                version: "8.2.0",
                abtest: ""
            }),
            ts: Math.floor(Date.now() / 1000),
            version: "8.2.0"
        };
    
        return this._fetchRequest({
            url: CONSTANTS.livefeedApiUrl,
            method: 'GET',
            params
        });
    },
    
    async liveclick(userCookies, roomid, upid, click = 10) {
        const params = {
            access_key: userCookies.access_token,
            actionKey: "appkey",
            anchor_id: upid,
            build: "8020300",
            c_locale: "zh_CN",
            channel: "yingyongbao",
            click_time: click,
            device: "android",
            disable_rcmd: "0",
            mobi_app: "android",
            platform: "android",
            room_id: roomid,
            s_locale: "zh_CN",
            statistics: JSON.stringify({
                appId: 1,
                platform: 3,
                version: "8.2.0",
                abtest: ""
            }),
            ts: Math.floor(Date.now() / 1000),
            uid: userCookies.DedeUserID,
            version: "8.2.0"
        };
    
        return this._fetchRequest({
            url: CONSTANTS.livelikeApiUrl,
            method: 'POST',
            params,
            extraHeaders: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
    },
    
    async liveshare(userCookies, roomid) {
        const params = {
            access_key: userCookies.access_token,
            actionKey: "appkey",
            build: "7750600",
            c_locale: "zh_CN",
            channel: "master",
            device: "android",
            disable_rcmd: "0",
            interact_type: "3",
            mobi_app: "android_i",
            platform: "android",
            roomid: roomid,
            s_locale: "zh_CN",
            statistics: JSON.stringify({
                appId: 1,
                platform: 3,
                version: "8.2.0",
                abtest: ""
            }),
            ts: Math.floor(Date.now() / 1000),
            version: "8.2.0"
        };
    
        return this._fetchRequest({
            url: 'https://api.live.bilibili.com/xlive/app-room/v1/index/TrigerInteract',
            method: 'POST',
            params,
            extraHeaders: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
    },
    
    async relationup(userCookies, mid, act, src = '11') {
        const params = {
            access_key: userCookies.access_token,
            act: act,
            build: "8020300",
            c_locale: "zh_CN",
            channel: "yingyongbao",
            disable_rcmd: "0",
            fid: mid,
            mobi_app: "android",
            platform: "android",
            re_src: src,
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
            url: CONSTANTS.relaApiUrl,
            method: 'POST',
            params,
            extraHeaders: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
    },
}
