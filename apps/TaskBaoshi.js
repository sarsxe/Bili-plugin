import {
    Config as config,
    Bili as Bili
} from "#model"
import {
    pluginRoot
} from '../model/constant.js';

const filePath = `${pluginRoot}/config/config.yaml`

export class BiliTaskBaoshi extends plugin {
    constructor() {
        super({
            name: "Bili:整点报时",
            desc: "整点语音报时",
            event: "message",
            priority: Number.MIN_SAFE_INTEGER,
            rule: []
        });
        this.task = {
            cron: '0 30 23 * * ?',
            name: '[Bili-plugin]整点报时',
            fnc: () => this.autobaoshi()
        }
    }

    async autobaoshi() {
        const configs = await Bili.loadConfig(filePath)
        const rawbaoshigroup = (await Bili.getConfig("baoshigroup", configs)) || []
        if (rawbaoshigroup.length === 0) return logger.info('[Bili-plugin]整点报时未配置群组，已自动跳过...')
        let groups = [];
        for (const g of rawbaoshigroup) {
            groups.push(Number(g))
        }
        const message = segment.record(config.baoshiapi)
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
