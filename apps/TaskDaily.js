import {
    Config as config,
    Bili as Bili
} from "#model"
import moment from 'moment';
import common from '../../../lib/common/common.js'

export class BiliTaskDaily extends plugin {
    constructor() {
        super({
            name: "Bili:日签打卡",
            desc: "QQ日签打卡",
            event: "message",
            priority: Number.MIN_SAFE_INTEGER,
            rule: [{
                reg: /^#?日签打卡$/,
                fnc: "QQDailysign",
                permission: 'master'
            }]
        });
        this.task = {
            cron: config.QQDaily,
            name: '[Bili-plugin]日签打卡',
            fnc: () => this.QQDailysign()
        }
    }

    async QQDailysign(e) {
        const forwardNodes = []
        const qq = await Bili.getQQlist()
        if (this.e) this.e.reply("开始对所有机器人执行日签打卡请稍等....", true, {
            recallMsg: 5
        })
        const tsstart = moment();
        let Count = 0
        for (const qqNum of qq) {
            try {
                let skey, pskey
                const cookies = await Bili.getQQck(qqNum, "ti.qq.com")
                if (cookies.code === 0) {
                    skey = cookies.skey
                    pskey = cookies.pskey
                } else {
                    logger.warn(`账号${qqNum}获取cookies失败，已跳过日签卡任务...\n错误信息：${cookies.msg}`)
                    forwardNodes.push({
                        user_id: Bot.uin,
                        nickname: Bot[Bot.uin]?.nickname || '机器人',
                        message: `账号${qqNum}获取cookies失败，已跳过日签卡任务...\n错误信息：${cookies.msg}`
                    })
                    Count++
                    continue
                }

                const msg = (await Bili.DailySignCard(qqNum, skey, pskey)).trim()
                const msg2 = (await Bili.Dailyfriend(qqNum, skey, pskey)).trim()
                logger.mark(`[Bili-plugin]日签打卡结果（QQ: ${qqNum}）: ${msg}\n${msg2}`);
                forwardNodes.push({
                    user_id: Bot.uin,
                    nickname: Bot[Bot.uin]?.nickname || '机器人',
                    message: `QQ: ${qqNum} 的打卡结果:\n${msg}\n${msg2}`
                })
                Count++
            } catch (error) {
                logger.error(`[Bili-plugin]处理 QQ ${qqNum} 时出错: ${error.message}`);
                forwardNodes.push({
                    user_id: Bot.uin,
                    nickname: Bot[Bot.uin]?.nickname || '机器人',
                    message: `QQ: ${qqNum} 的打卡失败: ${error.message}\n`
                });
            }
        }
        const tsfinish = moment()
        const duration = tsfinish.diff(tsstart)
        const durationObj = moment.duration(duration)
        let durationStr = ''
        const hours = durationObj.hours()
        const minutes = durationObj.minutes()
        const seconds = durationObj.seconds()
        if (hours > 0) {
            durationStr += `${hours}小时`
        }
        if (minutes > 0) {
            durationStr += `${minutes}分钟`
        }
        durationStr += `${seconds}秒`
        forwardNodes.push({
            user_id: Bot.uin,
            nickname: Bot[Bot.uin]?.nickname || '机器人',
            message: `任务耗时：${durationStr}\n总共执行账号：${Count}`
        })
        const forwardMessage = await Bot.makeForwardMsg(forwardNodes);
        if (this.e) {
            await e.reply(forwardMessage, false);
        } else {
            try {
                const cfg = (await import("../../../lib/config/config.js")).default;
                if (!Bot.sendMasterMsg) {
                    Bot.sendMasterMsg = async m => {
                        for (const i of cfg.masterQQ) await common.relpyPrivate(i, m)
                    }
                }
                if (forwardNodes.length) {
                    Bot.sendMasterMsg?.(forwardMessage);
                }
            } catch (error) {
                logger.error('不必要的错误，可以忽略', error)
            }
        }
    }
}
