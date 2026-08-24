import configs from '../model/Config.js';
import fs from 'fs'
import path from 'path'
import { MakButton as Make, Packet, loader as PluginLoader} from "#model"
if (!global.Packet) global.Packet = Packet
let QQBotconfig = null
/**
 * 动态导入模块，支持大小写不敏感的路径匹配
 * @param {string} modulePath - 模块路径
 * @returns {Promise<object|null>} 导入的模块或 null
 */
async function tryImport(modulePath) {
    try {
        return await import(modulePath)
    } catch (e) {
        const dir = path.dirname(modulePath)
        const fileName = path.basename(modulePath)
        try {
            const files = fs.readdirSync(dir);
            const matchedFile = files.find(file => 
                file.toLowerCase() === fileName.toLowerCase()
            )
            if (matchedFile) {
                const resolvedPath = path.join(dir, matchedFile)
                return await import(resolvedPath)
            }
        } catch (e) {
            return null
        }
        return null
    }
}
const possiblePaths = [
    '../../../plugins/Yunzai-QQBot-Plugin/Model/index.js',
    '../../../plugins/QQBot-Plugin/Model/index.js'
]
for (const modulePath of possiblePaths) {
    QQBotconfig = await tryImport(modulePath)
    if (QQBotconfig) break
}
if (!QQBotconfig) {
    logger.error(
        `[Bili-plugin] 未找到QQBot的配置文件 ${logger.yellow("直接发链接功能")} 将无法使用`
    )
}

let faces
(function initializeFaces() {
    faces = []
    if (configs?.faceids) {
    for (let i = 0; i < configs.faceids.length; i++) {
        faces.push({
            "1": String(configs.faceids[i]),
            "2": 1,
            "3": 1000,
            "4": 1
        })
    }
}
if (faces.length === 0) faces = [{
    "1": "66",
    "2": 1,
    "3": 1000,
    "4": 1
}]
})()

let attempts = 0
const maxAttempts = 200
const delay = 200
import setupNapcat from "../lib/qqbot/setup-napcat.js"
import setupICQQ from "../lib/qqbot/setup-icqq.js"
import setupQQBot from "../lib/qqbot/setup-qqbot.js"
const checkAdapters = async () => {
    const Napcat = Bot?.adapter?.find(adapter => adapter.name === 'OneBotv11')
    let QQBot = Bot?.adapter?.find(adapter => adapter.version === 'qq-group-bot v11.45.14')
    if (QQBotconfig) QQBot = Bot?.adapter?.find(adapter => adapter.name === 'QQBot')
    const ICQQ = Bot?.adapter?.find(adapter => adapter.name === 'ICQQ')
    const handleAdapters = () => {
        if (QQBot) setupQQBot(QQBot, QQBotconfig)
        if (ICQQ && configs.sendbutton) setupICQQ(ICQQ)
        if (Napcat && configs.sendbutton) setupNapcat(Napcat)
    }
    if (QQBot && ICQQ && Napcat) {
        handleAdapters()
        return
    }
    attempts++
    if (attempts >= maxAttempts) {
        handleAdapters()
        return
    }
    await new Promise(resolve => setTimeout(resolve, delay));
    await checkAdapters()
}
if (QQBotconfig && configs.QQBotsendlink || configs.sendbutton) checkAdapters()
Bot.on('message', async () => {
if (QQBotconfig && configs.QQBotsendlink || configs.sendbutton) checkAdapters()
})
const isTRSS = Array.isArray(Bot.uin)
if (isTRSS && (configs.Napsendtext || configs.ICQQsendfacetext)) {
    const originalLoaderReply = PluginLoader.reply
    PluginLoader.reply = function(e) {
        originalLoaderReply.call(this, e)
        const modifiedReply = e.reply
        e.reply = async (msg = "", quote = false, data = {}) => {
            if (e.group_id && (configs.Napsendtext && e.bot?.adapter?.name === 'OneBotv11') || (configs.ICQQsendfacetext && e.bot?.adapter?.name === 'ICQQ')) {
                let msgArray = Array.isArray(msg) ? [...msg] : [msg]
                const hasContent = msgArray.every(item => {
                    const type = item?.type;
                    return !type || type === 'text'
                })
                if (hasContent) {
                    let text = []
                    for (let i of msg) {
                        const type = i?.type
                        if (!type) {
                            text.push({ "1": { "1": i}})
                        } else {
                            text.push({ "1": { "1": i?.text}})
                        }
                    }
                    return Packet.Elem(e,[...text, {
                        "53": {
                         "1": 38,
                         "2": {
                          "1": {
                           "1": {
                            "1": 5,
                            "2": 7240
                           },
                           "2": faces
                          }
                         },
                         "3": 1
                        }
                    }])
                }
                }
            return modifiedReply(msg, quote, data)
        }
    }
}
