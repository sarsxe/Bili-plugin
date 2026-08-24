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

export class BiliTaskDanmu extends plugin {
    constructor() {
        super({
            name: "Bili:自动弹幕",
            desc: "自动发送直播弹幕",
            event: "message",
            priority: Number.MIN_SAFE_INTEGER,
            rule: []
        });
        this.task = {
            cron: config.livecron,
            name: '[Bili-plugin]自动发送弹幕',
            fnc: () => this.autodamu()
        }
    }
    async autodamu(e) {
        const cookiesDirPath = path.join('./data/bili');
        if (!fs.existsSync(cookiesDirPath)) {
            logger.info('[Bili-plugin] cookie目录不存在');
            return;
        }
        const files = fs.readdirSync(cookiesDirPath)
            .filter(file => path.extname(file) === '.json')
            .sort(() => Math.random() - 0.5);
        if (livesendtask) return logger.warn(`[Bili-plugin]自动弹幕任务进行中，本次自动跳过...`)
        livesendtask = true
        try {
            for (const file of files) {
                const fileName = path.basename(file, '.json');
                const cookiesFilePath = path.join(cookiesDirPath, file);
                const cookiesData = JSON.parse(fs.readFileSync(cookiesFilePath, 'utf-8'));
                if (Object.keys(cookiesData).length === 0) {
                    continue
                }
                let hasLiveEnabled = false;
                let hasLiveroom = false;
                const forwardNodes = [];
                let messageBuffer = [];
                const header = `[B站直播间弹幕&续牌功能推送]\n用户 ${fileName} 的弹幕功能结果\n`;

                for (const userId in cookiesData) {
                    if (!cookiesData[userId].live) {
                        logger.debug(`用户 ${fileName} 的B站账号 ${userId} 未开启自动弹幕`)
                        continue;
                    }
                    hasLiveEnabled = true;
                    const listPath = path.join('./data/bili/live', `${userId}.json`);
                    let whitelists = [];
                    let blacklists = [];
                    if (fs.existsSync(listPath)) {
                        try {
                            const listData = JSON.parse(fs.readFileSync(listPath, 'utf-8'));
                            whitelists = (listData.whitelists || []).map(String);
                            blacklists = (listData.blacklists || []).map(String);
                        } catch (err) {
                            logger.error(`[Bili-plugin] 配置文件 ${listPath} 加载失败：`, err);
                        }
                    }

                    try {
                        const liveroom = await Bili.getlivefeed(cookiesData[userId]);
                        if (!liveroom?.length) {
                            logger.mark(`用户 ${fileName} 哔站账号 ${userId} 的关注主播没开播`)
                            continue;
                        }

                        for (const room of liveroom) {
                            const roomId = room.roomid
                            const redisKey = `bili:aldamu:${userId}:${roomId}`;
                            if (await redis.get(redisKey)) {
                                logger.mark(`用户 ${fileName} 账号 ${userId} 4小时内已在房间 ${roomId} 发送过弹幕`)
                                continue;
                            }
                            let allowSend = true;
                            let reason = '';

                            if (whitelists.length > 0) {
                                if (!whitelists.includes(String(roomId))) {
                                    reason = `账号${userId}的煮波${room.name}(${roomId})不在白名单中，已跳过发送弹幕`;
                                    allowSend = false;
                                }
                            } else if (blacklists.includes(String(roomId))) {
                                reason = `账号${userId}的煮波${room.name}(${roomId})被你拉黑惹，已跳过发送弹幕`;
                                allowSend = false;
                            }

                            if (!allowSend) {
                                messageBuffer.push(reason);
                                logger.info(`[Bili-plugin] ${reason}`);
                                continue;
                            }
                            try {
                                const response = await fetch(config.yiyan);
                                const msg = (await response.text()).slice(0, 20);
                                const result = await Bili.livesenddamu(
                                    cookiesData[userId],
                                    msg,
                                    roomId
                                );

                                const formattedResult = result.replace(
                                    /直播间『(\d+)』/g,
                                    `『${room.name}』的直播间`
                                );

                                await redis.set(redisKey, '1', {
                                    EX: 14400
                                })

                                const result2 = await Bili.liveshare(cookiesData[userId], roomId)
                                // 随机直播间点赞：300~500 (点亮灯牌、贡献10)
                                const click = Math.floor(Math.random() * 201) + 300;

                                const result3 = await Bili.liveclick(cookiesData[userId], roomId, room.uid, click)

                                messageBuffer.push(`${formattedResult}\n${result2}\n${result3}`)

                                await Bili.sleep(2000)
                                hasLiveroom = true
                            } catch (err) {
                                messageBuffer.push(`账号${userId}向煮波${room.name}(${roomId})发弹幕失败：${err.message}`);
                            }
                        }
                    } catch (err) {
                        messageBuffer.push(`哔站账号 ${userId} 处理失败：${err.message}`);
                    }
                }
                while (messageBuffer.length > 0) {
                    const chunk = messageBuffer.splice(0, 5)
                    if (forwardNodes.length < 1)
                        forwardNodes.push(createForwardNode([header, ...chunk], fileName))
                    else
                        forwardNodes.push(createForwardNode([...chunk], fileName))
                }
                if (forwardNodes.length > 0 && hasLiveroom && hasLiveEnabled) {
                    try {
                        const forwardMessage = await Bot.makeForwardMsg(forwardNodes);
                        const groupKey = await redis.get(`bili:group:${fileName}`);
                        if (groupKey) {
                            const isTRSS = Array.isArray(Bot.uin)
                            if (isTRSS) {
                                Bot.pickGroup(groupKey).sendMsg(forwardMessage)
                            } else {
                                Bot[Bot.uin].pickGroup(groupKey).sendMsg(forwardMessage)
                            }
                        }
                    } catch (err) {
                        logger.error('[Bili-plugin] 消息发送失败：', err);
                    }
                }
                await Bili.sleep(5000)
            }
            livesendtask = false
        } catch (error) {
            logger.error('[Bili-plugin] 自动弹幕任务出错啦', error);
            livesendtask = false
        } finally {
            livesendtask = false
        }
    }


}
