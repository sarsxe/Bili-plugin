import fs from 'fs';
import path from 'path'
import { Bili as Bili} from "#model"
export class BiliAccount extends plugin {
    constructor() {
        super({
            name: "Bili:小功能",
            desc: "简单的统计",
            event: "message",
            priority: Number.MIN_SAFE_INTEGER,
            rule: [{
                reg: /^#?(B|b|币|逼|比|🖊|毕|哔|必|壁)(站|瞻|蘸|占|战|斩|展|沾|栈|湛)用户统计$/,
                fnc: "UserStat"
            },
            {
                reg: /^#?(B|b|币|逼|比|🖊|毕|哔|必|壁)?(站|瞻|蘸|占|战|斩|展|沾|栈|湛)?插件(使用|安装)?(用户)?(情况|状况|统计)$/,
                fnc: "BiliPlugin"
            },{
                reg: /^#?校验(B|b|币|逼|比|🖊|毕|哔|必|壁)?(站|瞻|蘸|占|战|斩|展|沾|栈|湛)?插件(可用性)?$/,
                fnc: "BiliPlugin"
            },{
                reg: /^#?节(假)?日查询$/,
                fnc: "festival"
            }]
        });
    }

    async festival(e) {
        const message = await Bili.getfestival()
        await this.e.reply(message,true)
    }

    async BiliPlugin(e) {
        if (!e.isMaster) return
        const r = await e.reply("开始为您校验插件并获取统计信息....",true)
        await Bili.recall(e, r, 5)
        try {
            const res = await Bili.fetchlist()
            const res2 = await Bili.Bilicheck()
            e.reply( `${res2}\n${res}`,true);
            return
        } catch (err) {
            logger.error("[Bili-plugin]校验失败：", err);
            e.reply("不好啦~插件凉凉惹TAT", true);
        }
    }

    async UserStat(e) {
        if (!e.isMaster) return;
        const cookiesDirPath = path.join('./data/bili');
        try {
            const files = fs.readdirSync(cookiesDirPath);
            const jsonFiles = files.filter(file => path.extname(file) === '.json');
            if (!jsonFiles.length) {
                return e.reply("还没有人用呢！", true);
            }
            const stats = jsonFiles.reduce((acc, file) => {
                const data = JSON.parse(fs.readFileSync(path.join(cookiesDirPath, file), 'utf-8'));
                acc.accounts += Object.keys(data).length;
                return acc;
            }, { persons: jsonFiles.length, accounts: 0 });
            await e.reply(`哔站用户统计：\n用户人数: ${stats.persons}\n账号数: ${stats.accounts}`, true);
            return
        } catch (error) {
            if (error.code === 'ENOENT') {
                e.reply("你都还没开始用本插件呢！！", true);
            } else {
                logger.error('统计出错:', error);
                e.reply("统计时发生错误，请查看日志", true);
            }
        }
    }
}