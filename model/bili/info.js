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
    },

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
    },

    async getmiyocode(action = 1) {
        return { retcode: 0, data: [], date: null }
    },

    async getfestival(num = 5) {
        return ["每日节日准时提醒！", "节日信息源已下线"]
    },

    async getyunshi(uin) {
        return ['运势服务已下线']
    },

    async gettoexplog(userCookies) {
        try {
            let response
            let expRet
            expRet = await BApi.exp_log2(userCookies)

            return expRet
        } catch (err) {
            logger.error("[Bili-plugin]获取经验日志失败", err);
        }
    },

    async getwebinfo(userCookies) {
        try {
            let response
            let web
            web = await BApi.myinfo(userCookies)

            return web
        } catch (err) {
            logger.error("[Bili-plugin]获取用户web端信息失败", err);
        }
    },

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
    },


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
    },


}
