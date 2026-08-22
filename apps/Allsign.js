import { Bili as Bili, Config as config} from "#model"
import fs from 'fs';
import path from 'path';
import moment from 'moment';
import common from '../../../lib/common/common.js'

export class Biliallsign extends plugin {
    constructor() {
        super({
            name: "Bili:全部签到",
            desc: "全部签到",
            event: "message",
            priority: Number.MIN_SAFE_INTEGER,
            rule: [{
                reg: /^#?(B|b|币|逼|比|🖊|毕|哔|必|壁)(站|瞻|蘸|占|战|斩|展|沾|栈|湛)全部签到$/,
                fnc: "signAllBilibili",
                permission: 'master'
            }]
        });

        this.task = {
            cron: config.cron,
            name: '[Bili-plugin]B站自动签到',
            fnc: () => this.signAllBilibili()
        };
    }

    async signAllBilibili(e) {
        try {
            if (await redis.get('bili:autosign:task')) {
                const message = await redis.get('bili:autosign:task');
                if (this.e) this.e.reply(message, true);
                return true;
            }

            await redis.set('bili:autosign:task', '正在初始化哔站签到任务，请勿重复执行签到操作....', {
                EX: 100
            });
            const [lists, botlists] = await Promise.all([
                Bili.targetUsers(),
                Bili.getQQlist()
            ]);
            await Bili.thumbUp(botlists, lists);
            const cookiesDirPath = path.join('./data/bili');
            if (!fs.existsSync(cookiesDirPath)) return;

            let files = fs.readdirSync(cookiesDirPath)
                .filter(file => path.extname(file) === '.json')
                .sort(() => Math.random() - 0.5)
            const tempDirPath = path.join('./data/bilisign');
            if (!fs.existsSync(tempDirPath)) {
                fs.mkdirSync(tempDirPath, {
                    recursive: true
                });
            }
            /*
            const existingFiles = fs.existsSync(tempDirPath) ?
                fs.readdirSync(tempDirPath).filter(file => path.extname(file) === '.json') : [];
            files = files.filter(file => !existingFiles.includes(file));
            */
            if (files.length === 0) {
                logger.mark("[Bili-plugin]全部哔站账号已完成签到");
                if (this.e) this.e.reply("所有用户已完成签到啦~", true);
                await redis.del('bili:autosign:task');
                return;
            }
            const ts = moment().format('YYYY-MM-DD HH:mm:ss');
            const tsstart = moment();
            const tasklength = files.length;
            const estimatedCompletionTime = moment().add(tasklength * 70, 'seconds').format('YYYY-MM-DD HH:mm:ss');
            let needMsg = false
            await redis.set('bili:autosign:task',
                `请勿执行签到操作！！！\n🌸当前正在执行哔站自动签到任务：\n🌸开始时间：${ts} \n🌸任务人数：${tasklength}\n🌸预计完成时间: ${estimatedCompletionTime}`, {
                    EX: tasklength * 70
                }
            );
            const m = `[🌸B站插件推送🌸]报告主人！\n我要开始哔站签到啦~\n任务人数：${tasklength}\n任务开始时间：${ts} \n预计完成时间: ${estimatedCompletionTime}`
            if (this.e) {
                this.e.reply(
                    m,
                    true
                );
            } else {
                try {
                    const cfg = (await import("../../../lib/config/config.js")).default;
                  if (!Bot.sendMasterMsg) {
                  Bot.sendMasterMsg = async m => { for (const i of cfg.masterQQ) await Bot.pickFriend(i).sendMsg(m) }
                  }
                  if(files.length){
                    Bot.sendMasterMsg?.(m);
                  }
                } catch (error) {
                    logger.error('不必要的错误，可以忽略',error)
                }
            }
            let signedCount = 0,
                signskipCount = 0,
                overdueCount = 0,
                count = 0;
            for (const file of files) {
                const cookiesFilePath = path.join(cookiesDirPath, file);
                const fileName = path.basename(file, '.json')
                const cookiesData = JSON.parse(fs.readFileSync(cookiesFilePath, 'utf-8'))
                if (Object.keys(cookiesData).length === 0) {
                    continue
                }
                let issign = false
                let forwardNodes = [];
                for (const userId in cookiesData) {
                    try {
                        if (await redis.get(`bili:alsign:${userId}`)) {
                            logger.warn(`[B站自动签到][QQ: ${fileName} 账号：${userId}] 今日已签`);
                            signskipCount++;
                            continue;
                        }
                        count++
                        logger.mark(`[B站自动签到][QQ: ${fileName} 账号：${userId}][第${count + 1}个]`);
                        const userCookies = cookiesData[userId];
                        let replyMessage = `[B站签到]🌸QQ: ${fileName} 账号：${userId} \n===========================\n`;
                        const r = await Bili.checkcookies(userCookies)
                        if(r.code !== 0) {
                           delete cookiesData[userId];
                           fs.writeFileSync(cookiesFilePath, JSON.stringify(cookiesData, null, 2))
                           logger.warn(`[B站自动签到][QQ: ${fileName} 账号：${userId}] Cookie已过期...`)
                           overdueCount++
                           continue
                        }

                        const videoData = await Bili.getFeed(userCookies).catch(err => {
                            logger.error(`[Bili-plugin]获取视频失败: ${err}`);
                            return []
                        })
                        for (let i = 0; i < videoData.length; i++) {
                            const video = videoData[i];
                            replyMessage += `🌸视频${i + 1}: ${video.short_link}\n`;
                        }
                        replyMessage += `===========================\n`;
                        if (userCookies.coin) {
                            const web = await Bili.getwebinfo(userCookies);
                            if (web.data.level === 6) {
                                replyMessage += "🌸恭喜您已达至尊6级，跳过投币任务\n";
                                replyMessage += `===========================\n`;
                            } else {
                                const expRet = await Bili.gettoexplog(userCookies);
                                const currentCoins = expRet.code === 0 ? expRet.data.coins : 0;
                                replyMessage += `🌸今日投币已领经验: ${currentCoins}\n`
                                const remainingCoins = Math.max(50 - currentCoins, 0);
                                const coinOperations = Math.min(Math.ceil(remainingCoins / 10), 5);
                                replyMessage += `🌸还需投${coinOperations}个硬币 \n`;
                                for (let i = 0; i < coinOperations && videoData[i]; i++) {
                                    const result = await Bili.addCoin(videoData[i].aid, userCookies);
                                    replyMessage += `${result}\n`;
                                    await Bili.sleep(2000);
                                }
                                replyMessage += `===========================\n`;
                            }
                        } else {
                            replyMessage += "🌸未开启投币功能，跳过投币任务\n";
                            replyMessage += `===========================\n`;
                        }

                        try {
                            for (const video of videoData) {
                                const res = await Bili.shareVideo(video.aid, userCookies);
                                replyMessage += `${res}\n`;
                                await Bili.sleep(1000);
                            }
                            replyMessage += `===========================\n`;
                        } catch (err) {
                            logger.error(`分享任务失败: ${err}`)
                            replyMessage += `🌸分享任务失败: 未知错误\n`;
                            replyMessage += `===========================\n`;
                        }
                        try {
                            for (const video of videoData) {
                                const res = await Bili.reportWatch(video.aid, video.cid, userCookies);
                                replyMessage += `${res}\n`;
                                await Bili.sleep(1000);
                            }
                            replyMessage += `===========================\n`;
                        } catch (err) {
                            logger.error(`观看任务失败: ${err}`);
                            replyMessage += `🌸观看任务失败: 未知错误\n`;
                            replyMessage += `===========================\n`;
                        }


                        try {
                            const res = await Bili.getCoupons(userCookies);
                            replyMessage += `${res}`;
                            replyMessage += `===========================\n`;
                        } catch (err) {
                            logger.error(`卡券领取失败: ${err}`);
                            replyMessage += `🌸卡券领取失败: 未知错误\n`;
                            replyMessage += `===========================\n`;
                        }
                        try {
                            const res = await Bili.getExperience(userCookies);
                            replyMessage += `🌸大会员经验: ${res}\n`;
                        } catch (err) {
                            logger.error(`经验领取失败: ${err}`);
                            replyMessage += `🌸大会员经验领取失败: 未知错误\n`;
                        }
                        try {
                            const signRes = await Bili.signManhua(userCookies)
                            await Bili.sleep(1000);
                            const shareRes = await Bili.shareManhua(userCookies)
                            replyMessage += `${signRes}\n${shareRes}\n`;
                        } catch (err) {
                            logger.error(`漫画任务失败: ${err}`);
                            replyMessage += `🌸漫画任务失败: 未知错误\n`;
                            replyMessage += `===========================\n`;
                        }

                        const cd = Math.floor((moment().endOf('day').valueOf() - Date.now()) / 1000);
                        await redis.set(`bili:alsign:${userId}`, '1', {
                            EX: cd
                        });
                        signedCount++;

                        forwardNodes.push({
                            user_id: '1677979616',
                            nickname: '堀',
                            message: replyMessage
                        });
                        issign = true
                        needMsg = true
                    } catch (err) {
                        logger.error(`[Bili-plugin]账号${userId}签到失败: ${err}`);
                    }
                }
                const savePath = path.join(tempDirPath, file);
                if(issign) fs.writeFileSync(savePath, JSON.stringify(forwardNodes, null, 4));
                const remainingTasks = files.length - signedCount
                if (remainingTasks > 0) {
                    const newET = moment().add(remainingTasks * 70, 'seconds').format('YYYY-MM-DD HH:mm:ss');
                    await redis.set('bili:autosign:task',
                        `🌸请勿执行签到操作！！！\n🌸当前正在执行哔站自动签到任务\n🌸任务剩余人数：${remainingTasks}\n🌸开始时间：${ts}\n🌸预计完成时间: ${newET}`, {
                            EX: remainingTasks * 70
                        }
                    );
                }
            }

            await redis.del('bili:autosign:task');
            const duration = moment().diff(tsstart)
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
            const reportMsg = `[🌸B站插件推送🌸]报告主人！\n哔站自动签到完成啦~` +
                `\n任务开始时间：${ts} \n任务人数：${tasklength}人` +
                `\n执行签到账号数:${signedCount}\n跳过账号数(已签):${signskipCount}\nCookie过期账号数:${overdueCount}` +
                `\n任务耗时：${durationStr}`;

            if (this.e) {
                this.e.reply(reportMsg, true);
            } else {
                try {
                    const cfg = (await import("../../../lib/config/config.js")).default;
                  if (!Bot.sendMasterMsg) {
                  Bot.sendMasterMsg = async m => { for (const i of cfg.masterQQ) await common.relpyPrivate(i, m) }
                  }
                  if(files.length && needMsg ){
                    Bot.sendMasterMsg?.(reportMsg);
                  }
                } catch (error) {
                 logger.error('不必要的错误，可以忽略',error)
                }
            }
        } catch (err) {
            logger.error(`[Bili-plugin]签到任务异常终止: ${err}`);
            await redis.del('bili:autosign:task');
            if (this.e) this.e.reply("签到任务执行失败，请检查日志", true);
        }
    }
}