import {
    Config as config,
    Bili as Bili
} from "#model"
import {
    pluginRoot
} from '../model/constant.js';

const filePath = `${pluginRoot}/config/config.yaml`

export class BiliTaskFestival extends plugin {
    constructor() {
        super({
            name: "Bili:节日推送",
            desc: "自动节日推送",
            event: "message",
            priority: Number.MIN_SAFE_INTEGER,
            rule: []
        });
        this.task = {
            cron: config.festivalpush,
            name: '[Bili-plugin]自动节日推送',
            fnc: () => this.autofestival()
        }
    }

    async autofestival() {
        const configs = await Bili.loadConfig(filePath)
        const rawfestivalgroup = (await Bili.getConfig("festivalgroup", configs)) || []
        if (rawfestivalgroup.length === 0) return logger.info('[Bili-plugin]自动节日推送未配置群组，已自动跳过...')
        let groups = [];
        for (const g of rawfestivalgroup) {
            groups.push(Number(g))
        }
        const message = await Bili.getfestival()
        for (const g of groups) {
            const isTRSS = Array.isArray(Bot.uin)
            if (isTRSS) {
                await Bot.pickGroup(g).sendMsg(message)
            } else {
                await Bot[Bot.uin].pickGroup(g).sendMsg(message)
            }
            await Bili.sleep(2500)
        }
    }
}
