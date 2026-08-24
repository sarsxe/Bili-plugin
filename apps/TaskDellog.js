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

export class BiliTaskDellog extends plugin {
    constructor() {
        super({
            name: "Bili:删除日志",
            desc: "自动删除B站日志文件",
            event: "message",
            priority: Number.MIN_SAFE_INTEGER,
            rule: []
        });
        this.task = {
            cron: '0 30 23 * * *',
            name: '[Bili-plugin]b站自动删除日志文件',
            fnc: () => this.Bilidellog()
        }
    }
    async Bilidellog(e) {
        const dirPath = path.join('./data/bilisign');

        try {
            if (!fs.existsSync(dirPath)) {
                logger.info('[Bili-plugin]签到日志目录不存在');
                return;
            }
            const files = await new Promise((resolve, reject) => {
                fs.readdir(dirPath, (err, files) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(files);
                    }
                });
            });

            const jsonFiles = files.filter(file => path.extname(file).toLowerCase() === '.json');

            if (jsonFiles.length === 0) {
                logger.warn('[Bili-plugin]没有找到哔站签到日志文件');
                return;
            }
            for (const file of jsonFiles) {
                const filePath = path.join(dirPath, file);
                try {
                    await new Promise((resolve, reject) => {
                        fs.unlink(filePath, err => {
                            if (err) {
                                reject(err);
                            } else {
                                resolve();
                            }
                        });
                    });
                    logger.info(`[Bili-plugin]已删除签到缓存文件 data/bilisign/${file}`);
                } catch (err) {
                    logger.error(`[Bili-plugin]无法删除签到缓存文件 ${file}: ${err}`);
                }
            }
            logger.info('[Bili-plugin]所有签到缓存文件已删除');
        } catch (err) {
            logger.error(`[Bili-plugin]无法读取签到缓存目录目录: ${err}`);
        }
    }
}
Bot.on('message', Bili.clean);
Bot.on('notice', Bili.clean);
Bot.on('request', Bili.clean);

function createForwardNode(messages, fileName) {
    return {
        user_id: Bot.uin,
        nickname: Bot[Bot.uin]?.nickname || '机器人',
        message: messages.join('\n')
    };
}
