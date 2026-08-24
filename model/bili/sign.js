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
    },

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
    },

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
    },

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
    },

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
    },

    async getQQlist() {
        let qq = [];
        const getUins = (source) => {
            if (Array.isArray(source)) {
                return source;
            } else if (typeof source === 'number' || typeof source === 'string') {
                return [source];
            }
            return [];
        };
        let uins = getUins(Bot.uin);
        if (uins.length === 0 && typeof Bin !== 'undefined' && Bin && Bin.uin) {
            uins = getUins(Bin.uin);
        }

        qq.push(...uins.map(Number).filter(num => !isNaN(num)));
        qq = [...new Set(qq)];
        logger.info(`[Bili-plugin]获取到 ${qq.length} 个机器人账号${qq.length ? ': ' + qq.join(', ') : ''}`);

        qq = qq.filter(number => !(
            (number >= 2854000000 && number <= 2855000000) ||
            (number >= 2854196301 && number <= 2854216399) ||
            (number >= 3889000000 && number <= 3890000000) ||
            number === 3328144510 ||
            number === 66600000 ||
            (number >= 4010000000 && number <= 4019999999)
        ))
        return qq;
    },

    async shareVideo(aid, userCookies) {
        try {
            const json = await BApi.shareVideo(aid, userCookies);
            return json.code === 0 ? `${aid} 分享: 成功` : `${aid} 分享: 失败(${json.message || json.msg || '未知错误'})`;
        } catch (err) {
            logger.error("[Bili-plugin]分享视频失败:", err);
            return `${aid} 分享: 失败(未知错误)`;
        }
    },

    async reportWatch(aid, cid, userCookies, time) {
        try {
            const json = await BApi.reportWatch(aid, cid, userCookies, time);
            return json.code === 0 ? `${aid} 观看: 成功` : `${aid} 观看: 失败(${json.message || json.msg || '未知错误'})`;
        } catch (err) {
            logger.error("[Bili-plugin]观看上报失败:", err);
            return `${aid} 观看: 失败(未知错误)`;
        }
    },

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
    },

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms))
    },

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
    },
}
