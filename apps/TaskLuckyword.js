import fs from "fs";
import path from "path";
import {
    Config as config,
    Bili as Bili
} from "#model"
import moment from "moment";
import common from "../../../lib/common/common.js"
import {
    pluginRoot
} from "../model/constant.js";

const filePath = `${pluginRoot}/config/config.yaml`
let livesendtask = false

export class BiliTaskLuckyword extends plugin {
    constructor() {
        super({
            name: "Bili:幸运字符",
            desc: "自动抽幸运字符",
            event: "message",
            priority: Number.MIN_SAFE_INTEGER,
            rule: [{
                reg: /^#?执行抽幸运字符$/,
                fnc: "autolukyword",
                permission: 'master'
            }]
        });
        this.task = {
            cron: config.luckywordcron,
            name: '[Bili-plugin]幸运字符',
            fnc: () => this.autolukyword()
        }
    }
    async autolukyword(e) {
        const configs = await Bili.loadConfig(filePath);
        const rawIsluckywordBots = (await Bili.getConfig("isluckywordBots", configs)) || [];
        if (!Array.isArray(rawIsluckywordBots)) {
            logger.warn('配置项 "isluckywordBots" 不是一个数组');
            return
        }
        const isluckywordBots = [];
        for (const bot of rawIsluckywordBots) {
            isluckywordBots.push(Number(bot.trim()));
        }

        if (isluckywordBots.length === 0) return this.e ? this.e.reply('幸运字符任务Bot名单为空，已自动跳过', true) : logger.info('幸运字符任务Bot名单为空，已自动跳过');

        const rawLuckywordwhites = (await Bili.getConfig("luckywordwhites", configs)) || [];
        if (!Array.isArray(rawLuckywordwhites)) {
            logger.warn('配置项 "luckywordwhites" 不是一个数组');
            return
        }
        const luckywordwhites = rawLuckywordwhites.map(entry => {
            const [botQQ, group] = entry.trim().split(':');
            return {
                botQQ: Number(botQQ),
                group: Number(group)
            };
        });

        const rawLuckywordblacks = (await Bili.getConfig("luckywordblacks", configs)) || [];
        if (!Array.isArray(rawLuckywordblacks)) {
            logger.warn('配置项 "luckywordblacks" 不是一个数组');
            return
        }
        const luckywordblacks = rawLuckywordblacks.map(entry => {
            const parts = entry.trim().split(':');
            return parts.length === 2 ? {
                botQQ: Number(parts[0]),
                group: Number(parts[1])
            } : {
                group: Number(parts[0])
            }
        });

        const rawIsviplists = (await Bili.getConfig("isviplists", configs)) || [];
        if (!Array.isArray(rawIsviplists)) {
            logger.warn('配置项 "isviplists" 不是一个数组');
            return
        }
        const isviplists = [];
        for (const bot of rawIsviplists) {
            isviplists.push(Number(bot.trim()));
        }

        const allMessages = [];
        if (this.e) {
            const r = await this.e.reply("开始执行抽取幸运字符任务，请稍等...", true);
            await Bili.recall(e, r, 5);
        }

        const tsstart = moment();
        let Count = 0;
        let Count2 = 0;

        for (const botQQ of isluckywordBots) {
            try {
                const rawGroupList = ((await Bili.getQQgrouplist(botQQ))).msg || [];
                const groupList = []
                for (const group of rawGroupList) {
                    groupList.push(Number(group));
                }
                if (groupList.length === 0) {
                    logger.mark(`机器人${botQQ}群聊列表为空，自动跳过幸运字符抽取...`);
                    continue;
                }

                const whiteGroups = [];
                for (const entry of luckywordwhites) {
                    if (entry.botQQ === botQQ) {
                        whiteGroups.push(entry.group);
                    }
                }

                let filteredGroups = [];
                if (whiteGroups.length > 0) {
                    for (const g of groupList) {
                        if (whiteGroups.includes(g)) {
                            filteredGroups.push(g);
                        }
                    }
                } else {
                    filteredGroups = [...groupList];
                }

                const blackGroups = [];
                for (const entry of luckywordblacks) {
                    if (entry.botQQ && entry.botQQ === botQQ) {
                        blackGroups.push(entry.group);
                    } else if (!entry.botQQ) {
                        blackGroups.push(entry.group);
                    }
                }

                for (const g of filteredGroups.slice()) {
                    if (blackGroups.includes(g)) {
                        filteredGroups.splice(filteredGroups.indexOf(g), 1);
                    }
                }

                filteredGroups = filteredGroups.filter(g => !blackGroups.includes(g));

                if (filteredGroups.length === 0) {
                    logger.mark(`机器人${botQQ}字符过滤配置后，群聊列表为空，自动跳过幸运字符抽取...`);
                    continue;
                }

                const isVip = isviplists.includes(botQQ);
                const execTimes = isVip ? 3 : 1;
                const cookieRes = await Bili.getQQck(botQQ, "qun.qq.com");
                const {
                    skey,
                    pskey
                } = cookieRes;

                if (!skey || !pskey) continue;

                for (const group of filteredGroups) {
                    logger.mark(`[${botQQ}@${group}]开始执行抽字符....`);

                    for (let i = 0; i < execTimes; i++) {
                        const r = await Bili.luckyword(botQQ, skey, pskey, group)
                        if ([0, -1].includes(r.code)) { //只记录0，-1
                            allMessages.push(`[${botQQ}@${group}] ${r.msg}\n`);
                        }
                    }
                    Count2++;
                }
            } catch (err) {
                logger.error(`[Bili-plugin]幸运字符在处理机器人 ${botQQ} 时出错:`, err)
            }

            Count++;
            await Bili.sleep(4000);
        }

        if (allMessages.length > 0) {
            const chunks = [];
            while (allMessages.length > 0) {
                chunks.push(allMessages.splice(0, 10).join('\n'));
            }

            const forwardNodes = chunks.map(chunk => ({
                user_id: Bot.uin,
                nickname: Bot[Bot.uin]?.nickname || '机器人',
                message: chunk
            }));

            const tsfinish = moment();
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
                message: `任务耗时：${durationStr}\n总共执行账号：${Count}\n总执行群数：${Count2}`
            });

            try {
                const forwardMessage = await Bot.makeForwardMsg(forwardNodes)
                if (this.e) {
                    await this.e.reply(forwardMessage, false);
                } else {
                    const cfg = (await import("../../../lib/config/config.js")).default;
                    if (!Bot.sendMasterMsg) {
                        Bot.sendMasterMsg = async m => {
                            for (const masterQQ of cfg.masterQQ) {
                                await common.relpyPrivate(masterQQ, m)
                            }
                        };
                    }
                    await Bot.sendMasterMsg(forwardMessage);
                }
            } catch (e) {
                logger.error('发送合并消息失败:', e);
            }
        }
    }




}
