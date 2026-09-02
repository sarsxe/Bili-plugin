import fetch from "node-fetch";
import moment from "moment";
import config from "../Config.js";
import BApi from "../BAPI/bapi/index.js";
import QApi from "../BAPI/QAPI.js";
import YAML from "yaml";
import fs from "fs";
import path from "path";
import lodash from "lodash";
import { exec } from "child_process";
import net from "net";
let visitorCookieCache = null
let visitorCookieExpire = 0

async function getVisitorCookie() {
    const now = Date.now()
    if (visitorCookieCache && visitorCookieExpire > now) return visitorCookieCache
    try {
        const resp = await fetch('https://api.bilibili.com/x/frontend/finger/spi', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/137.0.0.0 Safari/537.36',
                Referer: 'https://www.bilibili.com'
            },
            timeout: 8000
        })
        const contentType = resp.headers.get('content-type') || ''
        if (!resp.ok || !contentType.includes('application/json')) {
            throw new Error('获取访客Cookie失败: HTTP ' + resp.status)
        }
        const json = await resp.json()
        const b3 = json?.data?.b_3
        const b4 = json?.data?.b_4
        if (!b3 || !b4) throw new Error('获取访客Cookie失败: 响应缺少 buvid3/buvid4')
        const cookie = 'buvid3=' + b3 + '; buvid4=' + b4 + '; b_nut=' + Math.floor(now / 1000)
        visitorCookieCache = cookie
        visitorCookieExpire = now + 6 * 60 * 60 * 1000
        return cookie
    } catch (error) {
        logger.warn('[Bili-plugin] 获取访客Cookie失败，将不带Cookie请求: ' + error.message)
        visitorCookieCache = null
        visitorCookieExpire = now + 10 * 60 * 1000
        return ''
    }
}
export default {
    async getSourceMessage(e) {
        if (e.getReply) {
            return await e.getReply()
        } else if (e.source) {
            let source
            if (e.isGroup) {
                source = (await e.group.getChatHistory(e.source?.seq, 1)).pop()
            } else {
                source = (await e.friend.getChatHistory((e.source?.time + 1), 1)).pop()
            }
            return source
        }
        return null
    },

    async getvideourl(e) {
        const source = await this.getSourceMessage(e);
        if (!source) return false
        const parsedSource = JSON.parse(JSON.stringify(source));
        const regex = /https?:\/\/(b23\.tv\/[\w\-]+|live\.bilibili\.com\/[\w\-\/]+|www\.bilibili\.com\/[\w\-\/?=&;]+|bili2233\.cn\/[\w\-\/?=&;]+)/;
        for (let item of parsedSource.message) {
            if (item.type === 'text' || item.type === 'json') {
                let content;
                if (item.type === 'text') {
                    content = item.text;
                } else {
                    try {
                        const jsonData = JSON.parse(item.data);
                        content = jsonData.meta?.detail_1?.qqdocurl || jsonData
                    } catch (error) {
                        logger.error('[Bili-plugin]JSON 解析失败:', error);
                        continue
                    }
                }
                const match = content.match(regex);
                if (match) {
                    return match[0]
                }
            }
        }
        return null
    },

    async getfestival(num = 5) {
        return ["每日节日准时提醒！", "节日信息源已下线"]
    },

    async getyunshi(uin) {
        return ['运势服务已下线']
    },

    async getvideoinfo(url, cookies = config.SESSDATA) {
        return await this.localGetVideoInfo(url, cookies);
    },

    async localGetVideoInfo(url, cookies) {
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36 Edg/137.0.0.0',
            Referer: 'https://www.bilibili.com',
            Accept: '*/*',
            'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8'
        };
        if (cookies && /^[A-Za-z0-9,._%+\-\/=*]+$/.test(cookies)) {
            headers.Cookie = 'SESSDATA=' + cookies;
        } else {
            const visitorCookie = await getVisitorCookie();
            if (visitorCookie) headers.Cookie = visitorCookie;
        }

        const apiGet = async (api) => {
            const resp = await fetch(api, { headers });
            const contentType = resp.headers.get('content-type') || '';
            if (!resp.ok || !contentType.includes('application/json')) {
                const body = await resp.text();
                const preview = body.replace(/\s+/g, ' ').slice(0, 200);
                throw new Error('B站视频API返回异常: HTTP ' + resp.status + ' ' + contentType + '，可能触发风控，请检查SESSDATA、访客Cookie或代理；响应预览: ' + preview);
            }
            const json = await resp.json();
            if (json.code !== 0) throw new Error(`B站API错误: ${json.code} ${json.message}`);
            return json.data;
        };

        let bvid = null;
        let roomId = null;
        const directBv = url.match(/BV[0-9A-Za-z]{10}/);
        const directLive = url.match(/live\.bilibili\.com\/(\d+)/);
        if (directBv) {
            bvid = directBv[0];
        } else if (directLive) {
            roomId = directLive[1];
        } else {
            const resp = await fetch(url, { headers, redirect: 'follow' });
            const finalUrl = resp.url || url;
            bvid = finalUrl.match(/BV[0-9A-Za-z]{10}/)?.[0];
            roomId = finalUrl.match(/live\.bilibili\.com\/(\d+)/)?.[1];
        }

        if (roomId) return await this.localGetLiveInfo(roomId, headers);
        if (!bvid) throw new Error('local parse: cannot extract bvid from url: ' + url);

        const viewData = await apiGet(`https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`);
        const playData = await apiGet(`https://api.bilibili.com/x/player/playurl?bvid=${bvid}&cid=${viewData.cid}&qn=64&platform=html5&high_quality=1`);

        let online = { total: '0人在看', count: '0人正在看' };
        try {
            const od = await apiGet(`https://api.bilibili.com/x/player/online/total?bvid=${bvid}&cid=${viewData.cid}`);
            online = { total: `${od.total}人在看`, count: `${od.count}人正在看` };
        } catch (e) {}

        const fmtLen = (sec) => {
            const m = Math.floor(sec / 60);
            const s = Math.floor(sec % 60);
            return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        };

        return {
            type: 'video',
            data: {
                pic: viewData.pic,
                title: viewData.title,
                desc: viewData.desc,
                authorName: viewData.owner.name,
                mid: viewData.owner.mid,
                tname: viewData.tname || '视频',
                tname_v2: viewData.tname_v2 || '',
                stat: {
                    like: viewData.stat.like,
                    share: viewData.stat.share,
                    favorite: viewData.stat.favorite,
                    coin: viewData.stat.coin,
                    reply: viewData.stat.reply,
                    view: viewData.stat.view,
                    danmaku: viewData.stat.danmaku
                },
                length: fmtLen(viewData.duration),
                time: moment.unix(viewData.pubdate).format('YYYY-MM-DD HH:mm:ss'),
                online,
                size: playData.durl?.[0]?.size ?? 0,
                videoUrl: playData.durl?.[0]?.url ?? ''
            }
        };
    },

    async likevideo(userCookies, aid, action) {
        // action：0喜欢，1不喜欢
        try {
            let response
            let json
            json = await BApi.likevideo(userCookies, aid, action)

            const reply = action === 0 ? '点赞' : '取消点赞'
            return json.code === 0 ? `🌸${reply}视频成功` : `🌸${reply}视频失败:${json.message || json.msg || '未知错误'}`;
        } catch (err) {
            logger.error("[Bili-plugin]点赞操作失败:", err);
            return `🌸${reply}视频请求失败，请检查日志输出`
        }
    },

    async dislikevideo(userCookies, aid) {
        try {
            let response
            let json
            json = await BApi.dislikevideo(userCookies, aid)

            return json.code === 0 ? `🌸点踩视频成功` : `🌸点踩视频失败:${json.message || json.msg || '未知错误'}`;
        } catch (err) {
            logger.error("[Bili-plugin]点踩操作失败:", err);
            return `🌸点踩视频请求失败，请检查日志输出`
        }
    },

    async triplevideo(userCookies, aid) {
        try {
            let response
            let json
            json = await BApi.triplevideo(userCookies, aid)

            return json.code === 0 ? `🌸一键三连成功，视频已收藏至默认文件夹` : `🌸一键三连失败:${json.message || json.msg || '未知错误'}`;
        } catch (err) {
            logger.error("[Bili-plugin]一键三连操作失败:", err);
            return `🌸一键三连请求失败，请检查日志输出`
        }
    },

    async favvideo(userCookies, aid) {
        try {
            let response
            let json
            json = await BApi.favvideo(userCookies, aid)

            return json.code === 0 ? `🌸收藏视频成功，视频已收藏至默认文件夹` : `🌸收藏视频失败:${json.message || json.msg || '未知错误'}`;
        } catch (err) {
            logger.error("[Bili-plugin]收藏视频操作失败:", err);
            return `🌸收藏视频请求失败，请检查日志输出`
        }
    },

    async unfavvideo(userCookies, aid) {
        try {
            let response
            let json
            json = await BApi.unfavvideo(userCookies, aid)

            return json.code === 0 ? `🌸取消收藏视频成功！` : `🌸取消收藏视频失败:${json.message || json.msg || '未知错误'}`;
        } catch (err) {
            logger.error("[Bili-plugin]取消收藏视频操作失败:", err);
            return `🌸取消收藏视频请求失败，请检查日志输出`
        }
    },

    async replyvideo(userCookies, aid, msg) {
        try {
            let response
            let json
            json = await BApi.replyvideo(userCookies, aid, msg)

            return json.code === 0 ? `🌸评论视频成功！` : `🌸评论视频失败:${json.message || json.msg || '未知错误'}`;
        } catch (err) {
            logger.error("[Bili-plugin]评论视频操作失败:", err);
            return `🌸评论视频请求失败，请检查日志输出`
        }
    },

}
