import {
    Config as config,
    Bili as Bili
} from "#model"

export class BiliTaskCheck extends plugin {
    constructor() {
        super({
            name: "Bili:自动校验",
            desc: "定时校验插件状态",
            event: "message",
            priority: Number.MIN_SAFE_INTEGER,
            rule: []
        });
        this.task = {
            cron: '0 30 23 * * ?',
            name: '[Bili-plugin]自动校验插件',
            fnc: () => this.autocheck()
        }
    }

    async autocheck() {
        await Bili.fetchlist()
        await Bili.Bilicheck()
    }
}
