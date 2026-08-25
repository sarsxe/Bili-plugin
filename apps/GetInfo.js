import { Bili as Bili, Button as Button} from "#model"
import fs from 'fs';
import path from 'path';
import Render from '../model/renders.js';
import {pluginResources} from '../model/constant.js';

export class Biliinfo extends plugin {
    constructor() {
        super({
            name: "Bili:我的哔站",
            desc: "信息查询",
            event: "message",
            priority: Number.MIN_SAFE_INTEGER,
            rule: [{
                reg: /^#?(我的|他的|她的)(B|b|币|逼|比|🖊|毕|哔|必|壁)(站|瞻|蘸|占|战|斩|展|沾|栈|湛)$/,
                fnc: "biliinfo"
            }]
        });
    }

    async biliinfo(e) {
        let userID = String(e.user_id)
        let selfID = String(e.self_id)
        let qqNumbers = []
        for (let msg of e.message) {
            if (msg.type === 'at') {
                qqNumbers.push(msg.qq);
            }
        }
        if (qqNumbers.length > 0 && !e?.msg?.includes("我")) {
            userID = String(qqNumbers[0])
        }
        if (userID === selfID) userID = e.user_id
        const cookiesFilePath = path.join('./data/bili', `${String(userID).replace(/:/g, '_').trim()}.json`);
        if (!fs.existsSync(cookiesFilePath)) {
            e.reply(["未绑定ck，请发送【哔站登录】进行绑定", new Button().bind()])
            return
        }
        const cookiesData = JSON.parse(fs.readFileSync(cookiesFilePath, 'utf-8'));
        if (Object.keys(cookiesData).length === 0) {
            return await e.reply(["您的登录已过期，请先发送【哔站登录】重新进行绑定", new Button().bind()])
         }
         const r = await e.reply("开始获取你的B站信息请稍等....", true)
         await Bili.recall(e, r, 5) 
        let forwardNodes = [];

        for (const userId in cookiesData) {
            try {
                const userCookies = cookiesData[userId];
                const infoData = await Bili.getInfo(userCookies)
                const num = Math.floor(Math.random() * infoData.collectionTop.length)
                const params = {
                    isSelf: userCookies.DedeUserID,
                    avatarUrl: infoData.face,
                    replace_face: infoData.face,
                    name: infoData.name,
                    uid: infoData.uid,
                    pendantname: infoData.pendant?.name,
                    guajian: infoData.pendant?.image,
                    fans: infoData.fans,
                    attention: infoData.attention,
                    coins: infoData.coins,
                    sign: infoData.sign,
                    vipClass: infoData.vipStatus ? 'active' : '',
                    vipText: infoData.vipStatus ? infoData.vipLabel : '无会员',
                    vipDue: infoData.vipStatus ? infoData.vipDue : '',
                    statusClass: infoData.accountStatus === '正常' ? 'normal' : 'danger',
                    accountStatus: infoData.accountStatus,
                    currentLevel: 'Lv.' + infoData.currentLevel,
                    expNeeded: infoData.expNeeded,
                    daysToLevelUp: infoData.daysToLevelUp,
                    coinClass: infoData.coinStatus ? 'success' : 'danger',
                    coinStatus: infoData.coinStatus ? '开启' : '关闭',
                    liveClass: infoData.liveStatus ? 'success' : 'danger',
                    liveStatus: infoData.liveStatus ? '开启' : '关闭',
                    birthday: infoData.birthday,
                    expireTime: infoData.expireTime,
                    expTasks: infoData.expTasks,
                };
                if (infoData.collectionTop[num]?.cover) {
                    params.bgcover = infoData.collectionTop[num].cover;
                } else {
                    params.bgcover = `${pluginResources}/imgs/main.png`
                }
                const image = await Render.render('Template/Info/info', params, {
                    e,
                    retType: 'base64'
                });

                forwardNodes.push({
                    user_id: e.user_id || '1677979616',
                    nickname: e.sender.nickname || '哔站信息查询',
                    message: image
                });

            } catch (err) {
                logger.error("[Bili-plugin]获取哔站信息失败:", err);
                forwardNodes.push({
                    user_id: e.user_id || '1677979616',
                    nickname: e.sender.nickname || '哔站信息查询',
                    message: "图片生成失败：" + err.message
                });
            }
        }

        if (forwardNodes.length === 1) {
            try { await e.reply([forwardNodes[0].message, new Button().info()], true) } catch { await e.reply(forwardNodes[0].message) }
        } else {
            const forwardMessage = await Bot.makeForwardMsg(forwardNodes);
            e.reply([forwardMessage, new Button().info()], false);
        }
        return true
    }
}