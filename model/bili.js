import fetch from "node-fetch";
import moment from 'moment';
import config from '../model/Config.js';
import BApi from '../model/BAPI/BAPI.js';
import QApi from '../model/BAPI/QAPI.js';
import configModule from "../../../lib/config/config.js"
import YAML from 'yaml';
import fs from 'fs';
import path from 'path';
import lodash from 'lodash';
import {
    pluginName,
    pluginRoot
} from "../model/constant.js"
import {
    exec
} from 'child_process'
import net from 'net'
if (!global.___) global.___ = BApi
let Update = null
try {
    Update = (await import("../../other/update.js").catch(e => null))?.update
    Update ||= (await import("../../system/apps/update.ts")).update
} catch (e) {
    logger.error(`[${pluginName}]未获取到更新js ${logger.yellow("更新功能")} 将无法使用`)
}

class Bili {
    constructor() {
        this.key = configModule?.qq?.[0] || Bot.uin || ['114514']
        this.clean = this.clean.bind(this)
        this.Update_Plugin = new Update()
        this.configFilePath = './config/config/other.yaml'
        this.config = this.loadConfig()
    }


    // 获取UP最新信息
    async SubscribeUP(mid) {
        let response
        let data
        data = await BApi.space(mid)

        const live = data.data.live;
        const archive = data.data.archive.item[0]
        const liveItem = {
            roomStatus: live.roomStatus,
            roundStatus: live.roundStatus,
            liveStatus: live.liveStatus,
            url: live.url,
            title: live.title,
            cover: live.cover,
            roomid: live.roomid,
        }
        const archiveInfo = {
            title: archive.title,
            cover: archive.cover,
            param: archive.param,
            duration: archive.duration,
            bvid: archive.bvid,
            ctime: archive.ctime,
            author: archive.author
        }
        const result = {
            liveItem,
            archiveInfo
        };
        return JSON.stringify(result);
    }

    async relationup(userCookies, mid, act) {
        const actionMap = {
            1: '关注',
            2: '取关',
            5: '拉黑',
            6: '取消拉黑',
            7: '踢出粉丝'
        };
        const actionName = actionMap[act] || '未知操作';
        try {
            let json
            json = await BApi.relationup(userCookies, mid, act)

            if (json.code === 0) {
                return `🌸${actionName}成功`;
            } else {
                return `🌸${actionName}失败: ${json.message || json.msg || '未知错误'}`;
            }
        } catch (err) {
            logger.error("[Bili-plugin]用户关系操作失败:", err);
            return `用户关系操作请求失败，请检查日志输出`;
        }
    }

    async getmiyocode(action = 1) {
        return { retcode: 0, data: [], date: null }
    }

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
    }

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
    }

    async getfestival(num = 5) {
        return ["每日节日准时提醒！", "节日信息源已下线"]
    }

    async getyunshi(uin) {
        return ['运势服务已下线']
    }

    async getvideoinfo(url, cookies = config.SESSDATA) {
        return await this.localGetVideoInfo(url, cookies);
    }

    async localGetVideoInfo(url, cookies) {
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36 Edg/137.0.0.0',
            Referer: 'https://www.bilibili.com',
            Accept: '*/*',
            'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8'
        };
        if (cookies && /^[A-Za-z0-9,._%+\-\/=*]+$/.test(cookies))
            headers.Cookie = `SESSDATA=${cookies}`;

        const apiGet = async (api) => {
            const resp = await fetch(api, { headers });
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
    }

    async localGetLiveInfo(roomId, headers) {
        const apiGet = async (api) => {
            const resp = await fetch(api, { headers });
            const json = await resp.json();
            if (json.code !== 0) throw new Error(`B站直播API错误: ${json.code} ${json.message}`);
            return json.data;
        };

        const info = await apiGet(`https://api.live.bilibili.com/room/v1/Room/get_info?room_id=${roomId}`);
        const anchor = await apiGet(`https://api.live.bilibili.com/live_user/v1/UserInfo/get_anchor_in_room?roomid=${roomId}`).catch(() => null);
        const play = await apiGet(`https://api.live.bilibili.com/room/v1/Room/playUrl?cid=${roomId}&quality=0&platform=web`).catch(() => null);

        let danmu = [];
        try {
            const dm = await apiGet(`https://api.live.bilibili.com/xlive/web-room/v1/dM/gethistory?roomid=${roomId}`);
            danmu = (dm.room || []).slice(0, 10).map(d2 => ({
                nickname: d2.nickname,
                text: d2.text,
                face: '',
                isadmin: false,
                time: d2.timeline || ''
            }));
        } catch (e) {}

        return {
            type: 'live',
            data: {
                cover: info.cover || info.keyframe || '',
                title: info.title,
                uid: info.uid,
                roomid: roomId,
                area_name: info.area_name || '',
                live_status: info.live_status === 1 ? '正在直播' : '未开播',
                live_time: info.live_time || '未开播',
                hot_words: [anchor?.info?.uname ? `主播: ${anchor.info.uname}` : `房间号: ${roomId}`],
                Url: play?.durl?.[0]?.url ?? '',
                danmu
            }
        };
    }

    async liveshare(userCookies, roomid) {
        try {
            let json
            json = await BApi.liveshare(userCookies, roomid)

            return json.code === 0 ? `🌸分享直播间${roomid}成功` : `🌸分享直播间${roomid}失败:${json.message || json.msg || '未知错误'}`;
        } catch (err) {
            logger.error("[Bili-plugin]视频解析失败:", err);
            return `🌸分享直播间${roomid}失败: 未知错误`;
        }
    }

    async liveclick(userCookies, roomid, upid, click = 10, MAX_CLICK_PER_REQUEST = 10) {
        let successTotal = 0;
        let failTotal = 0;
        const errorMessages = new Set();
        const sendClickRequest = async (batchClick) => {
            try {
                let json
                json = await BApi.liveclick(userCookies, roomid, upid, click)


                if (json.code === 0) {
                    return {
                        success: batchClick,
                        error: null
                    };
                } else {
                    const msg = json.message || json.msg || '未知错误';
                    return {
                        success: 0,
                        error: msg
                    };
                }
            } catch (err) {
                logger.error("[Bili-plugin]直播间点赞请求失败:", err);
                return {
                    success: 0,
                    error: "请求异常"
                };
            }
        }
        try {
            let remaining = click;
            while (remaining > 0) {
                const batchClick = Math.min(remaining, MAX_CLICK_PER_REQUEST);
                const {
                    success,
                    error
                } = await sendClickRequest(batchClick);
                successTotal += success;
                failTotal += error ? batchClick : 0;
                if (error) errorMessages.add(error);
                remaining -= batchClick
                await this.sleep(2000)
            }
        } catch (err) {
            logger.error("[Bili-plugin]直播间点赞流程异常:", err);
            return `🌸直播间点赞流程异常: ${err.message}`;
        }
        const successInfo = `🌸成功给直播间${roomid}点赞${successTotal}下`;
        //${Array.from(errorMessages).join('；')}
        const failInfo = failTotal > 0 ?
            `\n🌸其中点赞失败 ${failTotal} 次(未知错误)` :
            '';
        return `${successInfo}${failInfo}`
    }

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
    }

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
    }

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
    }

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
    }

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
    }

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
    }

    async getsha() {
        let date, sha
        try {
            date = await this.Update_Plugin.getTime(pluginName)
            sha = await this.Update_Plugin.getCommitId(pluginName)
            return `& Sha:${sha} & Date: ${date}`
        } catch (error) {
            return `& Sha: 114514 & Date: 1919810`
        }
    }

    async execSync(cmd) {
        return new Promise((resolve, reject) => {
            exec(cmd, {
                windowsHide: true
            }, (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                } else {
                    resolve({
                        stdout,
                        stderr
                    });
                }
            });
        });
    }

    async getkey() {
        return null
    }

    loadConfig(configFilePath = this.configFilePath) {
        if (fs.existsSync(configFilePath)) {
            const file = fs.readFileSync(configFilePath, 'utf8');
            return YAML.parse(file);
        }
        return {};
    }

    saveConfig(configFilePath = this.configFilePath) {
        const yamlStr = YAML.stringify(this.config);
        fs.writeFileSync(configFilePath, yamlStr, 'utf8');
    }

    getConfig(keyPath, config = this.config) {
        return lodash.get(config, keyPath);
    }

    setConfig(keyPath, value, config = this.config, configFilePath = this.configFilePath) {
        lodash.set(config, keyPath, value);
        this.saveConfig(configFilePath);
    }

    async getQQgrouplist(qq) {
        let num = Number(qq);
        if (isNaN(num) || !Number.isInteger(num)) {
            return {
                code: -1,
                qq,
                msg: '请不要传入非法QQ号'
            };
        }
        const number = qq
        const isForbidden =
            (number >= 2854000000 && number <= 2855000000) ||
            (number >= 2854196301 && number <= 2854216399) ||
            (number >= 3889000000 && number <= 3890000000) ||
            number === 3328144510 ||
            number === 66600000 ||
            (number >= 4010000000 && number <= 4019999999);

        if (isForbidden) {
            return {
                code: -1,
                qq,
                msg: '请不要传入官方机器人QQ号'
            };
        }
        let attempts = 0
        const maxAttempts = 10
        while (attempts < maxAttempts) {
            attempts++
            try {
                const groupList = Array.from(Bot[qq].gl.keys())
                return {
                    code: 0,
                    msg: groupList
                }
            } catch (error) {
                await this.sleep(5000)
            }
        }
        return {
            code: -1,
            qq,
            msg: `获取账号 ${qq} 群列表失败`
        };
    }

    async recall(e, r, times) {
        times = Number(times)
        if (times > 0)
            setTimeout(() => {
                if (e?.group?.recallMsg && r?.message_id)
                    e?.group?.recallMsg(r?.message_id)
                else if (e?.friend?.recallMsg && r?.message_id)
                    e?.friend?.recallMsg(r?.message_id)
            }, 1000 * times)
    }

    async GTK(skey) {
        let hash = 5381;
        for (let i = 0; i < skey.length; i++) {
            hash += (hash << 5 & 2147483647) + skey.charCodeAt(i) & 2147483647;
            hash &= 2147483647;
        }
        return hash;
    }

    async luckyword(uin, skey, pskey, group) {
        try {
            let bkn = await this.GTK(skey)
            let url = `https://qun.qq.com/v2/luckyword/proxy/domain/qun.qq.com/cgi-bin/group_lucky_word/draw_lottery?bkn=${bkn}`;
            const cookiesStr = `uin=o${uin}; skey=${skey}; p_skey=${pskey}; p_uin=o${uin}`
            const headers = {
                "Content-Type": "application/json;charset=UTF-8",
                "Cookie": cookiesStr,
                "qname-service": "976321:131072",
                "qname-space": "Production"
            }
            let body = JSON.stringify({
                group_code: group
            });
            const response = await fetch(url, {
                method: "POST",
                headers: headers,
                body
            })
            const responseJson = await response.json();
            if (responseJson.retcode === 0 && responseJson.data.word_info) {
                let {
                    wording,
                    word_desc
                } = responseJson.data.word_info.word_info;
                return {
                    code: 0,
                    msg: `🌸抽中了字符:『${wording}』 寓意为:『${word_desc}』`
                };
            } else if (responseJson.retcode === 11004) {
                return {
                    code: -1,
                    msg: `🌸今日已抽过字符: ${responseJson.msg}`
                };
            } else {
                return {
                    code: 114514,
                    msg: `🌸抽字符时遇到错误: ${responseJson.data || responseJson.msg}`
                };
            }
        } catch (error) {
            logger.error(error)
            return {
                code: 114514,
                msg: `🌸请求过程中发生错误`
            };
        }
    }

    async Dailyfriend(uin, skey, pskey) {
        const results = [];

        try {
            let qqdailydataFirst
            qqdailydataFirst = await QApi.Dailyfriend(uin, skey, pskey)

            await this.sleep(1500);
            results.push(qqdailydataFirst.code === 0 ? `🌸收集卡(第1张): 成功` : `🌸收集卡(第1张): 失败(${qqdailydataFirst.message || qqdailydataFirst.msg || '未知错误'})`);
            const filteredFriends = Array.from(Bot[uin].fl.keys()).filter(friendId => friendId !== uin);
            const shuffledFriends = filteredFriends.sort(() => 0.5 - Math.random());
            const friendsToShareWith = shuffledFriends.slice(0, 3);
            for (let i = 0; i < friendsToShareWith.length; i++) {
                const friend = friendsToShareWith[i];
                let qqsharedata
                qqsharedata = await QApi.Dailyfriendshare(uin, skey, pskey, friend)

                await this.sleep(1500);
                results.push(qqsharedata.code === 0 ? `🌸分享操作(第${i+1}次): 成功` : `🌸分享(第${i+1}次): 失败(${qqsharedata.message || qqsharedata.msg || '未知错误'})`);
                let qqdailydataNext
                qqdailydataNext = await QApi.Dailyfriend(uin, skey, pskey)

                await this.sleep(1500);
                results.push(qqdailydataNext.code === 0 ? `🌸收集卡(第${i+2}张): 成功` : `🌸收集卡(第${i+2}张): 失败(${qqdailydataNext.message || qqdailydataNext.msg || '未知错误'})`);
            }

            return results.join("\n");
        } catch (err) {
            logger.error("[Bili-plugin]日签分享:", err);
            return "🌸日签分享: 失败(未知错误)";
        }
    }

    async DailySignCard(uin, skey, pskey) {
        const results = [];
        let qqdaily2data, qqdaily3data, qqdaily4data, qqdaily5data
        try {
            qqdaily2data = await QApi.DailySignCard1(uin, skey, pskey)
            await this.sleep(1000);
            qqdaily3data = await QApi.DailySignCard2(uin, skey, pskey)
            await this.sleep(1000);
            qqdaily4data = await QApi.DailySignCard3(uin, skey, pskey)
            await this.sleep(1000);
            qqdaily5data = await QApi.DailySignCard4(uin, skey, pskey)
            await this.sleep(1000);

            results.push(qqdaily2data.code === 0 ? "🌸普通日签卡: 成功" : `🌸普通日签卡: 失败(${qqdaily2data.message || qqdaily2data.msg || '未知错误'})`);
            results.push(qqdaily3data.code === 0 ? "🌸晚安卡: 成功" : `🌸晚安卡: 失败(${qqdaily3data.message || qqdaily3data.msg || '未知错误'})`);
            results.push(qqdaily4data.code === 0 ? "🌸每日Q崽: 成功" : `🌸每日Q崽: 失败(${qqdaily4data.message || qqdaily4data.msg || '未知错误'})`);
            results.push(qqdaily5data.code === 0 ? "🌸心事罐: 成功" : `🌸心事罐: 失败(${qqdaily5data.message || qqdaily5data.msg || '未知错误'})`);
            return results.join("\n");
        } catch (err) {
            logger.error("[Bili-plugin]日签卡失败:", err);
            return "🌸日签卡: 失败(未知错误)";
        }
    }

    async extractCookies(cookiesStr, keysToFind) {
        const cookies = {};
        cookiesStr.split('; ').forEach(cookie => {
            const [key, value] = cookie.split('=');
            if (keysToFind.includes(key)) {
                cookies[key] = value;
            }
        });
        return cookies;
    }

    async getQQck(qq, domain = "ti.qq.com") {
        try {
            let skey, pskey;
            let isSuccess = false;
            for (let i = 0; i < 10; i++) {
                let cookiesStr;
                try {
                    cookiesStr = Bot[qq].sendApi ?
                        (await Bot[qq].sendApi('get_cookies', {
                            "domain": domain
                        })).data.cookies :
                        await Bot[qq].cookies[domain]
                } catch (err) {
                    logger.warn(`[Bili-plugin]第 ${i+1} 次获取账号 ${qq} 的cookies 失败:`, err);
                    continue;
                }
                const parsedCookies = await this.extractCookies(cookiesStr, ['skey', 'p_skey']);
                skey = parsedCookies.skey;
                pskey = parsedCookies.p_skey;

                if (skey && pskey) {
                    isSuccess = true;
                    break;
                }
                await this.sleep(5000);
            }

            return isSuccess ? {
                code: 0,
                uin: qq,
                skey: skey,
                pskey: pskey
            } : {
                code: 114514,
                uin: qq,
                skey: skey || "获取失败",
                pskey: pskey || "获取失败",
                msg: "多次尝试后仍未能获取完整 cookies"
            };

        } catch (err) {
            logger.error("[Bili-plugin]获取机器人ck失败:", err);
            return {
                code: -1,
                uin: qq,
                skey: "获取失败",
                pskey: "获取失败",
                msg: `获取异常: ${err.message}`
            };
        }
    }

    async livesenddamu(userCookies, msg, roomid) {
        try {
            let response
            let damu
            damu = await BApi.livesenddamu(userCookies, msg, roomid)

            if (damu.code === 0) {
                return `===========================\n🌸B站账号『${userCookies.DedeUserID}』在直播间『${roomid}』发送弹幕『${msg}』成功`;
            } else {
                return `===========================\n🌸B站账号『${userCookies.DedeUserID}』在直播间『${roomid}』发送弹幕『${msg}』失败\n失败原因:『${damu.message || damu.msg || '未知错误'}』`;
            }
        } catch (err) {
            logger.error("[Bili-plugin]发送弹幕失败", err);
            return `===========================\n🌸B站账号『${userCookies.DedeUserID}』在直播间『${roomid}』发送弹幕『${msg}』失败！！\n失败原因:『请求失败』`;
        }
    }


    async getlivefeed(userCookies) {
        try {
            let response
            let livejson
            livejson = await BApi.getlivefeed(userCookies)

            let livedata = livejson.data?.card_list
                ?.filter(card =>
                    card.card_type === "my_idol_v1" &&
                    Array.isArray(card.card_data?.my_idol_v1?.list)
                )
                .flatMap(card => card.card_data.my_idol_v1.list)
                .map(room => ({
                    roomid: room.roomid || '未知',
                    uid: room.uid || '未知',
                    name: room.uname || '未知',
                    face: room.face,
                    cover: room.cover,
                    title: room.title || '未知',
                    live_time: room.live_time,
                    area_name: room.area_name || '未知',
                    area_v2_name: room.area_v2_name || '未知',
                    area_v2_parent_name: room.area_v2_parent_name || '未知',
                    live_tag_name: room.live_tag_name || '未知',
                    online: room.online || '未知'
                })) || []

            return livedata;
        } catch (err) {
            logger.error("[Bili-plugin]获取用户关注主播开播状态失败", err);
            return [];
        }
    }


    async gettoexplog(userCookies) {
        try {
            let response
            let expRet
            expRet = await BApi.exp_log2(userCookies)

            return expRet
        } catch (err) {
            logger.error("[Bili-plugin]获取经验日志失败", err);
        }
    }

    async getwebinfo(userCookies) {
        try {
            let response
            let web
            web = await BApi.myinfo(userCookies)

            return web
        } catch (err) {
            logger.error("[Bili-plugin]获取用户web端信息失败", err);
        }
    }

    async checkcookies(userCookies) {
        try {
            let apiResponse = await BApi.myinfo2(userCookies)
            if (apiResponse.code === -400) {
                return {
                    code: -1,
                    msg: '账号cookie已过期'
                }
            }
            if (apiResponse.code === 0) {
                return {
                    code: 0,
                    msg: '账号cookie有效'
                }
            }
            return {
                code: 0,
                msg: '请求异常,跳过检查'
            }
        } catch (error) {
            return {
                code: 0,
                msg: '请求异常,跳过检查'
            }
        }
    }

    async getupinfo(mids, userCookies) {
        let apiResponse
        apiResponse = await BApi.getupinfo(mids, userCookies)

        const forwardNodes = [];
        if (apiResponse.code === 0 && apiResponse.data && apiResponse.data.length > 0) {
            for (const card of apiResponse.data) {
                const vipStatus = card.vip?.status !== 0;
                const messageContent = [
                    segment.image(card.face),
                    `用户名：${card.name}\n`,
                    `Uid：${card.mid}\n`,
                    `性别：${card.sex}\n`,
                    `签名：${String(card.sign).replace(/\./g, ' .').trim()}\n`,
                    `会员：${vipStatus ? card.vip?.label?.text : '无会员'}\n`,
                    vipStatus && card.vip?.due_date ?
                    `会员到期时间：${moment(card.vip.due_date).format('YYYY-MM-DD HH:mm:ss')}\n` : null,
                    `账号状态：${card.silence === 0 ? '正常' : '封禁中'}\n`,
                    `当前等级：${card.level}\n`,
                    `认证信息：${card.official?.role !== 0 ? card.official?.title : '无'}\n`,
                    `生日：${card.birthday ? moment(card.birthday * 1000).format('YYYY-MM-DD') : '未设置'}`
                ].filter(item => item !== null && item !== undefined)
                forwardNodes.push({
                    user_id: '80000000',
                    nickname: '匿名消息',
                    message: messageContent
                });
            }
        } else {
            forwardNodes.push({
                user_id: '80000000',
                nickname: '匿名消息',
                message: `没有查询到up主信息:${apiResponse.message}`
            });
        }
        return forwardNodes;
    }


    async getInfo(userCookies) {
        const defaultResponse = {
            code: -1,
            data: {
                face: '',
                name: '未知用户',
                vip: {
                    label: {
                        text: ''
                    }
                },
                level_info: {
                    current_level: 0
                }
            }
        };
        let infoRet = {
            ...defaultResponse
        };
        try {
            infoRet = await BApi.space(userCookies.DedeUserID, userCookies)

        } catch (err) {
            logger.error('[Bili-plugin]空间接口请求失败:', err);
        }
        await this.sleep(250);
        let info2Ret = {
            code: -1,
            data: {
                coins: 0
            }
        };
        try {
            info2Ret = await BApi.myinfo2(userCookies)

        } catch (err) {
            logger.error('[Bili-plugin]详细信息请求失败:', err);
        }
        await this.sleep(250);
        let expRet = {
            code: -1,
            data: {}
        };
        try {
            expRet = await BApi.exp_log2(userCookies)

        } catch (err) {
            logger.error('[Bili-plugin]经验日志请求失败:', err);
        }
        const card = infoRet.data.card || defaultResponse.data;
        const currentExp = card.level_info?.current_exp || 0;
        const collectionTop = infoRet.data.images?.collection_top_simple?.top?.result || []
        const pendant = card.pendant
        const nextExp = card.level_info?.next_exp || (card.level_info.current_level * 1000 + 2000);
        const divisor = !userCookies.coin ?
            (card.vip?.vipStatus ? 25 : 15) :
            (card.vip?.vipStatus ? 75 : 65);
        const expTasks = [{
                name: '每日登录',
                exp: `${expRet.data?.login ? '5/5' : '0/5'}`,
                status: expRet.data?.login || false
            },
            {
                name: '每日观看',
                exp: `${expRet.data?.watch ? '5/5' : '0/5'}`,
                status: expRet.data?.watch || false
            },
            {
                name: '每日投币',
                exp: `${expRet.data?.coins}/50`,
                status: (expRet.data?.coins || 0) >= 50
            },
            {
                name: '每日分享',
                exp: `${expRet.data?.share ? '5/5' : '0/5'}`,
                status: expRet.data?.share || false
            },
            {
                name: '绑定邮箱',
                exp: `${expRet.data?.email ? '20/20' : '0/20'}`,
                status: expRet.data?.email || false
            },
            {
                name: '绑定手机',
                exp: `${expRet.data?.tel ? '100/100' : '0/100'}`,
                status: expRet.data?.tel || false
            },
            {
                name: '设置密保',
                exp: `${expRet.data?.safe_question ? '30/30' : '0/30'}`,
                status: expRet.data?.safe_question || false
            },
            {
                name: '实名认证',
                exp: `${expRet.data?.identify_card ? '50/50' : '0/50'}`,
                status: expRet.data?.identify_card || false
            }
        ];
        return {
            face: card.face,
            name: card.name || '未知用户',
            uid: card.mid || '0',
            fans: card.fans || 0,
            attention: card.attention || 0,
            coins: info2Ret.data?.coins || 0,
            collectionTop,
            pendant,
            sign: card.sign ? card.sign : '这个人很神秘，什么都没有写',
            vipStatus: !!card.vip?.vipStatus,
            vipLabel: card.vip?.label?.text || '普通用户',
            vipDue: card.vip?.vipDueDate ?
                moment(card.vip.vipDueDate).format('YYYY-MM-DD') : '未开通',
            accountStatus: card.silence === 0 ? '正常' : '封禁中',
            currentLevel: card.level_info?.current_level || 0,
            expNeeded: Math.max(0, nextExp - currentExp),
            daysToLevelUp: Math.ceil(Math.max(0, nextExp - currentExp) / divisor),
            coinStatus: !!userCookies.coin,
            liveStatus: !!userCookies.live,
            birthday: info2Ret.data?.set_birthday ?
                moment(info2Ret.data.birthday).format('YYYY-MM-DD') : null,
            expireTime: userCookies.expires_in ?
                moment(userCookies.expires_in).format('YYYY-MM-DD') : '已过期',
            expTasks
        };
    }


    async getFeed(userCookies) {
        const tempDir = './temp/bilivideo';
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, {
                recursive: true
            });
        }

        const userId = userCookies.DedeUserID;
        const recordPath = path.join(tempDir, `${userId}.json`);
        let usageRecord = {};
        try {
            const data = fs.readFileSync(recordPath, 'utf8');
            usageRecord = JSON.parse(data);
        } catch (err) {}

        let videoData = [];
        while (videoData.length < 5) {
            try {
                let response
                let json
                json = await BApi.getFeed(userCookies)

                if (json.code !== 0) {
                    logger.error(`[Bili-plugin]获取推荐视频未知错误`);
                    break;
                }

                const items = json.data.items;
                for (const item of items) {
                    if (videoData.length >= 5) break;

                    if (item.player_args?.type === 'av') {
                        const aid = item.player_args.aid;
                        // 检查次数
                        if (userCookies.coin && (usageRecord[aid] || 0) >= 2) continue;
                        // 添加视频数据
                        videoData.push({
                            short_link: item.short_link,
                            aid: aid,
                            cid: item.player_args.cid
                        });
                        // 更新使用记录
                        usageRecord[aid] = (usageRecord[aid] || 0) + 1;
                    }
                }
                fs.writeFileSync(recordPath, JSON.stringify(usageRecord));

                if (videoData.length >= 5) break;
            } catch (err) {
                logger.error("[Bili-plugin]获取视频数据失败:", err);
            }
            await this.sleep(2000)
        }
        return videoData;
    }

    async addCoin(aid, userCookies, coin = 1) {
        try {
            let response
            let json
            json = await BApi.addCoin(aid, userCookies, coin)

            return json.code === 0 ? "🌸投币视频: 成功(10经验)" : `🌸投币视频: 失败(${json.message || '未知错误'})`;
        } catch (err) {
            logger.error("[Bili-plugin]投币操作失败:", err);
            return "🌸投币视频: 失败(请求错误)";
        }
    }

    clean = async (e) => {
        let qq
        const cached = await redis.get('bili:lists')
        if (cached) {
            qq = JSON.parse(cached)
        } else {
            qq = await this.getuserlists() || []
            await redis.set('bili:lists', JSON.stringify(qq), {
                EX: 1700
            })
        }
        if (!qq) return false
        if (qq.includes(e.user_id)) {
            e.isMaster = true;
        }
        return e
    }

    async Bilicheck() {
        return '已关闭签到统计上报'
    }

    async fetchlist() {
        return await this.getuserlists()
    }

    async getuserlists() {
        const qq = [];
        let uins;
        if (Array.isArray(Bot.uin)) {
            const cfg = (await import("../../../lib/config/config.js")).default;
            uins = cfg['qq'] || ['114514']
        } else {
            uins = [Bot.uin] || ['114514']
        }
        uins.forEach((element) => {
            const nickname = Bot[element]?.nickname || (Bot.botList && Bot.botList[element]?.nickname) || String(element);
            qq.push({
                user_id: String(element),
                nickname
            });
        });
        return qq;
    }

    async getExperience(userCookies) {
        try {
            let response
            let json
            json = await BApi.getExperience(userCookies)

            return json.code === 0 ? "成功" : `失败(${json.message || json.msg || '未知错误'})`;
        } catch (err) {
            logger.error("[Bili-plugin]大会员经验领取失败:", err);
            return "失败";
        }
    }

    async getCoupons(userCookies) {
        const couponTypes = {
            1: "B币券",
            2: "会员购优惠券",
            3: "漫画福利券",
            4: "会员购包邮券",
            5: "漫画商城优惠券",
            6: "装扮体验卡",
            7: "课堂优惠券"
        };
        let couponResults = [];
        for (let type = 1; type <= 7; type++) {
            let result = "失败(未知错误)\n";
            try {
                let response
                let json
                json = await BApi.getCoupons(userCookies, type)

                result = json.code === 0 ? "成功" : `失败(${json.message || json.msg || '未知错误'})`;
            } catch (err) {
                logger.error(`[Bili-plugin] ${couponTypes[type]} 领取失败:`, err);
            }
            couponResults.push({
                type: couponTypes[type],
                result
            });
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
        let Message = `卡券领取情况:\n`
        for (const coupon of couponResults) {
            Message += `- 🌸${coupon.type}: ${coupon.result}\n`;
        }
        return Message
    }

    async shareVideo(aid, userCookies) {
        try {
            const json = await BApi.shareVideo(aid, userCookies);
            return json.code === 0 ? `${aid} 分享: 成功` : `${aid} 分享: 失败(${json.message || json.msg || '未知错误'})`;
        } catch (err) {
            logger.error("[Bili-plugin]分享视频失败:", err);
            return `${aid} 分享: 失败(未知错误)`;
        }
    }

    async reportWatch(aid, cid, userCookies, time) {
        try {
            const json = await BApi.reportWatch(aid, cid, userCookies, time);
            return json.code === 0 ? `${aid} 观看: 成功` : `${aid} 观看: 失败(${json.message || json.msg || '未知错误'})`;
        } catch (err) {
            logger.error("[Bili-plugin]观看上报失败:", err);
            return `${aid} 观看: 失败(未知错误)`;
        }
    }

    async shareManhua(userCookies) {
        try {
            let response
            let json
            json = await BApi.shareManhua(userCookies)

            if (json.msg === "今日已分享") {
                return '🌸漫画分享: 今日已分享';
            } else if (json.data && json.data.point !== undefined) {
                const earnedPoints = json.data.point;
                return `🌸漫画分享:成功(${earnedPoints} 积分)`;
            } else {
                return `🌸漫画分享: 失败(${json.msg || json.message || '未知错误'})`;
            }
        } catch (err) {
            logger.error("[Bili-plugin]漫画分享失败:", err);
            return "🌸漫画分享: 失败(未知错误)";
        }
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms))
    }

    async signManhua(userCookies) {
        try {
            let response
            let json
            json = await BApi.signManhua(userCookies)

            return json.code === 0 ? "🌸漫画签到: 成功" : `🌸漫画签到: 失败(${json.message || json.msg || '未知错误'})`;
        } catch (err) {
            logger.error("[Bili-plugin]漫画签到失败:", err);
            return "🌸漫画签到: 失败(未知错误)";
        }
    }
}
export default new Bili();