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

export default {
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
    },

    async recall(e, r, times) {
        times = Number(times)
        if (times > 0)
            setTimeout(() => {
                if (e?.group?.recallMsg && r?.message_id)
                    e?.group?.recallMsg(r?.message_id)
                else if (e?.friend?.recallMsg && r?.message_id)
                    e?.friend?.recallMsg(r?.message_id)
            }, 1000 * times)
    },

    async GTK(skey) {
        let hash = 5381;
        for (let i = 0; i < skey.length; i++) {
            hash += (hash << 5 & 2147483647) + skey.charCodeAt(i) & 2147483647;
            hash &= 2147483647;
        }
        return hash;
    },

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
            const contentType = response.headers.get('content-type') || ''
            if (!contentType.includes('application/json')) {
                logger.warn(`[Bili-plugin]幸运字符接口返回非JSON内容（群${group}），可能是Cookie失效或接口变更`)
                return {
                    code: 114514,
                    msg: `🌸抽字符接口异常，请尝试刷新CK后重试`
                };
            }
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
    },

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
    },

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
    },

    async extractCookies(cookiesStr, keysToFind) {
        const cookies = {};
        cookiesStr.split('; ').forEach(cookie => {
            const [key, value] = cookie.split('=');
            if (keysToFind.includes(key)) {
                cookies[key] = value;
            }
        });
        return cookies;
    },

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
    },

}
