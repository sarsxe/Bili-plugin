import fs from 'fs';
import path from 'path';
import { Config as config, Button as Button, Bili as Bili} from "#model"
export class Bilisign extends plugin {
    constructor() {
        super({
            name: "Bili:签到",
            desc: "签到",
            event: "message",
            priority: Number.MIN_SAFE_INTEGER,
            rule: [{
                reg: /^#?(B|b|币|逼|比|🖊|毕|哔|必|壁)(站|瞻|蘸|占|战|斩|展|沾|栈|湛)(重新)?签到$/,
                fnc: "signBilibili"
            }]
        });
    }

    async signBilibili(e) {
        const cookiesFilePath = path.join('./data/bili', `${String(e.user_id).replace(/:/g, '_').trim()}.json`);
        if (!fs.existsSync(cookiesFilePath)) {
            e.reply(["未绑定ck，请发送【哔站登录】进行绑定", new Button().bind()])
            return true
        }

        const cookiesData = JSON.parse(fs.readFileSync(cookiesFilePath, 'utf-8'));
        if (Object.keys(cookiesData).length === 0) {
            return  await e.reply(["您的登录已过期，请先发送【哔站登录】重新进行绑定", new Button().bind()])
        }

        if (await redis.get('bili:autosign:task')) {
            const message = await redis.get('bili:autosign:task')
            this.e.reply(message, true)
            return true
        }

        let forwardNodes = []
        let sign = false
        if (await redis.get(`bili:sign:task:${e.user_id}`)) {
            const message = await redis.get(`bili:sign:task:${e.user_id}`)
            this.e.reply(message, true)
            return true
        } else {
            await redis.set(`bili:sign:task:${e.user_id}`, '正在给你签到啦，请勿重复签到....', {
                EX: 260
            })
        }
        if (e.msg.includes('重新')) {
            e.reply("开始重新执行哔站签到任务...", true)
            sign = true
        }
        if (!sign) {
            const r = await e.reply(["开始给你哔站签到啦~请稍等...",new Button().help()], true)
            await Bili.recall(e, r, 5)
        }
        let Count = 0
        let issign = false
        for (const userId in cookiesData) {
            const userCookies = cookiesData[userId];
            if (e.msg.includes('重新')) {
                redis.del(`bili:alsign:${userId}`)
            }
            if (await redis.get(`bili:alsign:${userId}`)) {
                logger.warn(`[B站自动签到][QQ: ${e.user_id} 账号：${userId}] 今日已签`);
                await this.e.reply([`[QQ: ${e.user_id} 账号：${userId}] 今日已签\n查看签到记录请发送<B站签到记录>`])
                await Bili.sleep(2000)
                continue
            }

            let replyMessage = `[B站签到]🌸QQ: ${e.user_id} 账号：${userId} \n===========================\n`;
            const r = await Bili.checkcookies(userCookies)
            if (r.code !== 0) {
                delete cookiesData[userId];
                fs.writeFileSync(cookiesFilePath, JSON.stringify(cookiesData, null, 2))
                logger.warn(`[B站签到][QQ: ${fileName} 账号：${userId}] Cookie已过期...`)
                await this.e.reply([`B站账号${userId}的Cookie已过期, 请发送【哔站登录】重新进行绑定...`, new Button().bind()])
                continue
            }
            let videoData

            try {
                videoData = await Bili.getFeed(userCookies);
                for (let i = 0; i < videoData.length; i++) {
                    const video = videoData[i];
                    replyMessage += `视频${i + 1}: ${video.short_link}\n`;
                }
                replyMessage += `===========================\n`;
            } catch (error) {
                logger.error(`[Bili-plugin]获取视频失败: ${error}`);
                replyMessage += `获取视频失败: 未知错误\n===========================\n`;
            }

            try {
                let coinOperations = 5;

                if (!userCookies.coin) {
                    replyMessage += "🌸您未开启投币任务,进行跳过操作\n";
                } else {
                    const web = await Bili.getwebinfo(userCookies);
                    if (web.data.level === 6) {
                        replyMessage += "🌸恭喜您已达至尊，6级啦~ 跳过投币任务\n";
                        replyMessage += `===========================\n`;
                    } else {
                        const expRet = await Bili.gettoexplog(userCookies);
                        if (expRet.code === 0) {
                            const currentCoins = expRet.data.coins;
                            const targetCoins = 50;
                            let remainingCoins = Math.max(targetCoins - currentCoins, 0);
                            coinOperations = Math.ceil(remainingCoins / 10);

                            replyMessage += `🌸今日投币已领经验: ${currentCoins}\n`;
                            replyMessage += `🌸还需投${coinOperations}个硬币 \n`;
                        } else {
                            logger.warn("[Bili-plugin]获取今日投币数失败，默认执行5次投币操作");
                            replyMessage += "获取今日投币数失败: 默认投5个硬币\n";
                        }

                        if (coinOperations > 0) {
                            for (let i = 0; i < coinOperations && i < videoData.length; i++) {
                                const video = videoData[i];
                                const result = await Bili.addCoin(video.aid, userCookies);
                                replyMessage += `${result}\n`;
                                await Bili.sleep(4000);
                            }
                        }
                    }
                }
                replyMessage += `===========================\n`;
            } catch (error) {
                logger.error(`[Bili-plugin]投币任务失败: ${error}`);
                replyMessage += `🌸投币任务失败: 未知错误\n===========================\n`;
            }

            try {
                for (const video of videoData) {
                    const shareResult = await Bili.shareVideo(video.aid, userCookies);
                    replyMessage += `${shareResult}\n`;
                    await Bili.sleep(1000);
                }
                replyMessage += `===========================\n`;
            } catch (error) {
                logger.error(`[Bili-plugin]分享视频失败: ${error}`);
                replyMessage += `🌸分享视频失败: 未知错误\n===========================\n`;
            }

            try {
                for (const video of videoData) {
                    const watchResult = await Bili.reportWatch(video.aid, video.cid, userCookies);
                    replyMessage += `${watchResult}\n`;
                    await Bili.sleep(2000);
                }
                replyMessage += `===========================\n`;
            } catch (error) {
                logger.error(`[Bili-plugin]观看视频失败: ${error}`);
                replyMessage += `🌸观看视频失败: 未知错误\n===========================\n`;
            }

            try {
                const couponsResult = await Bili.getCoupons(userCookies);
                replyMessage += `${couponsResult}`;
                replyMessage += `===========================\n`;
            } catch (error) {
                logger.error(`[Bili-plugin]领取卡券失败: ${error}`);
                replyMessage += `🌸领取卡券失败: 未知错误\n===========================\n`;
            }
            try {
                const expResult = await Bili.getExperience(userCookies);
                replyMessage += `🌸大会员经验: ${expResult}\n`;
            } catch (error) {
                logger.error(`[Bili-plugin]领取大会员经验失败: ${error}`);
                replyMessage += `🌸领取大会员经验失败: 未知错误\n`;
            }
            try {
                const manhuaSignResult = await Bili.signManhua(userCookies);
                replyMessage += `${manhuaSignResult}\n`;
            } catch (error) {
                logger.error(`[Bili-plugin]漫画签到失败: ${error}`);
                replyMessage += `🌸漫画签到失败: 未知错误\n`;
            }
            try {
                const manhuaShareResult = await Bili.shareManhua(userCookies);
                replyMessage += `${manhuaShareResult}`;
            } catch (error) {
                logger.error(`[Bili-plugin]漫画分享失败: ${error}`);
                replyMessage += `🌸漫画分享失败: 未知错误\n`;
            }


            if (['QQBot'].includes(e.adapter_name) && !config.QQBotsendlink ) {
                replyMessage = String(replyMessage).replace(/https:\/\/b23\.tv\//g, 'https://b23 .tv/')
            }
            forwardNodes.push({
                user_id: e.user_id || '1677979616',
                nickname: e.sender.nickname || '哔站签到',
                message: replyMessage
            });
            const cd = Math.floor((new Date().setHours(24, 0, 0, 0) - Date.now()) / 1000 - 1);
            redis.set(`bili:alsign:${userId}`, '1', {
                EX: cd
            })
            Count++
            if (Count > 0) {
                await Bot.sleep(2000)
            }
            issign = true
        }
        const forwardMessage = await Bot.makeForwardMsg(forwardNodes)
        if (issign) e.reply([forwardMessage, new Button().help()])
        const tempDirPath = path.join('./data/bilisign');
        if (!fs.existsSync(tempDirPath)) {
            fs.mkdirSync(tempDirPath, {
                recursive: true
            });
        }
        const savePath = path.join(tempDirPath, `${e.user_id}.json`)
        if (issign) fs.writeFileSync(savePath, JSON.stringify(forwardNodes, null, 4), {
            flag: 'w'
        });
    }
}