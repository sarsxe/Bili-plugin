import { Config as config, Button as Button, BAPI as BApi, Bili as Bili, _ as ___} from "#model"
import { syncAccountToConfig } from '../lib/config.js'
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import moment from 'moment';
if (!global.___) global.___ = ___
const Running = {}
const tempBilibiliDir = './data/bili'

export class Bililogin extends plugin {
    constructor() {
        super({
            name: "Bili:登录",
            desc: "登录",
            event: "message",
            priority: Number.MIN_SAFE_INTEGER,
            rule: [{
                    reg: /^#?(B|b|币|逼|比|🖊|毕|哔|必|壁)(站|瞻|蘸|占|战|斩|展|沾|栈|湛)(扫码)?(登陆|登录)$/,
                    fnc: "bililogin"
                },
                {
                    reg: /^#?刷新(B|b|币|逼|比|🖊|毕|哔|必|壁)(站|瞻|蘸|占|战|斩|展|沾|栈|湛)ck$/,
                    fnc: "refreshUserToken"
                }
            ]
        });
    }

    async bililogin(e) {
        if (Running[e.user_id]) return e.reply("前置二维码未失效，请稍后尝试", true);
        if (!fs.existsSync(tempBilibiliDir)) {
            fs.mkdirSync(tempBilibiliDir, {
                recursive: true
            })
        }
        try {
            const loginkey = `${e.user_id}:${e.self_id}`
            const qrInfo = await BApi.getloginqrcode(loginkey, e)
            if (qrInfo.data.url) this.reply([segment.image(qrInfo.data.url), '请在90s内使用B站进行扫码\n本消息2分钟后自动撤回', new Button().bind()], true, { recallMsg: 120 })
            else this.reply([segment.image(qrInfo.data.base64), '请在90s内使用B站进行扫码\n本消息2分钟后自动撤回', new Button().bind()], true, { recallMsg: 120 })
            Running[e.user_id] = true
            const maxPolls = 18
            const intervalTime = 5000
            let scanned = false
            for (let pollCount = 0; pollCount < maxPolls; pollCount++) {
                await Bili.sleep(intervalTime)
                try {
                    const result = await BApi.pollQrCode(loginkey)
                    if (result.code === 0 && result.data) {
                        await this.saveCookieData(String(e.user_id).replace(/:/g, '_').trim(), result.data, e)
                            try { await e.reply(['登录成功', new Button().help()], true) } catch { await e.reply(['登录成功', new Button().help()]) }
                        Running[e.user_id] = false
                        if (e.group_id) redis.set(`bili:group:${String(e.user_id).replace(/:/g, '_').trim()}`, `${e.group_id}`)
                        return true
                    } else if (result.code === 86038) {
                        e.reply('登录二维码已失效，请重新尝试', true);
                        Running[e.user_id] = false
                        return true
                    } else if (result.code === 86090) {
                        if (!scanned) {
                            scanned = true
                            e.reply('扫码成功，请确认登录', true)
                        }
                    }
                } catch (error) {
                    logger.error('[Bili-Plugin]登录错误', error);
                    e.reply(['发生错误，请稍后再试', new Button().bind()])
                    Running[e.user_id] = false
                    return true
                }
            }
            try { await e.reply(['登录超时显类后同唎杔测小', new Button().bind()], true) } catch { await e.reply(['登录超时显类后同唎杔测小', new Button().bind()]) }
            Running[e.user_id] = false
            return true
        } catch (error) {
            logger.error('[Bili-Plugin]获取二维码报错：', error)
            e.reply('获取二维码失败，请稍后再试', true)
            Running[e.user_id] = false
            return true
        }
    }

    async saveCookieData(userId, data, e) {
        const storagePath = path.join(tempBilibiliDir, `${userId}.json`);
        const cookiesArray = data.cookie.split('; ');
        let parsedCookies = {};
        cookiesArray.forEach(cookie => {
            const [key, value] = cookie.split('=');
            switch (key) {
                case 'SESSDATA':
                    parsedCookies['SESSDATA'] = value;
                    break;
                case 'bili_jct':
                    parsedCookies['csrf'] = value;
                    break;
                case 'DedeUserID':
                    parsedCookies['DedeUserID'] = value;
                    break;
                case 'DedeUserID__ckMd5':
                    parsedCookies['DedeUserID__ckMd5'] = value;
                    break;
                case 'sid':
                    parsedCookies['sid'] = value;
                    break;
                case 'access_key':
                    parsedCookies['access_token'] = value;
                    break;
                default:
                    break;
            }
        });

        const currentTimestampInSeconds = Math.floor(Date.now() / 1000);
        const expiresTimestampInSeconds = currentTimestampInSeconds + parseInt(data.expires_in, 10);
        const expiresTimestampInMillis = expiresTimestampInSeconds * 1000;
        parsedCookies['refresh_token'] = data.refresh_token;
        parsedCookies['expires_in'] = expiresTimestampInMillis;

        let cookies = {};
        if (fs.existsSync(storagePath)) {
            cookies = JSON.parse(fs.readFileSync(storagePath, 'utf-8'));
        }
        if (cookies[parsedCookies['DedeUserID']]) {
            const existingCustomFields = {
                coin: cookies[parsedCookies['DedeUserID']].coin,
                live: cookies[parsedCookies['DedeUserID']].live
            }
            cookies[parsedCookies['DedeUserID']] = {
                ...parsedCookies,
                ...existingCustomFields
            }
        } else {
            cookies[parsedCookies['DedeUserID']] = {
                ...parsedCookies,
                coin: true,
                live: false
            }
        }
        if (!fs.existsSync(path.dirname(storagePath))) {
            fs.mkdirSync(path.dirname(storagePath), {
                recursive: true
            })
        }
        fs.writeFileSync(storagePath, JSON.stringify(cookies, null, 2))
        redis.set(`bili:userset:${String(e.user_id).replace(/:/g, '_').trim()}`, parsedCookies['DedeUserID'])
        syncAccountToConfig(String(e.user_id).replace(/:/g, '_').trim(), cookies)
    }

    async refreshUserToken(e) {
        const cookieFile = path.join('./data/bili', `${String(e.user_id).replace(/:/g, '_').trim()}.json`);
        let cookies = {};
        try {
            if (!fs.existsSync(cookieFile)) throw new Error("Cookie file does not exist.");
            cookies = JSON.parse(fs.readFileSync(cookieFile, 'utf8'))
            if (Object.keys(cookies).length === 0) {
                return await e.reply(["您的登录已过期，请先发送【哔站登录】重新进行绑定", new Button().bind()])
            }
        } catch (err) {
            e.reply(["未绑定ck，请发送【哔站登录】进行绑定", new Button().bind()])
            return
        }

        const refreshedAccounts = [];
        let anyFailure = false;
        let Count = 0
        for (const [DedeUserID, userCookies] of Object.entries(cookies)) {
            if (!userCookies.access_token || !userCookies.refresh_token) {
                refreshedAccounts.push(`账号 ${DedeUserID} 未找到有效的token信息`);
                anyFailure = true;
                continue;
            }
            try {
                const data = await BApi.refresh(userCookies.access_token, userCookies.refresh_token)

                if (data.code === 0) {
                    const expires = data.data.token_info.expires_in;
                    const ts = Math.floor(Date.now() / 1000);
                    const expirationTime = ts + expires;
                    const updatedCookies = {
                        access_token: data.data.token_info.access_token,
                        SESSDATA: data.data.cookie_info.cookies.find(c => c.name === 'SESSDATA')?.value,
                        csrf: data.data.cookie_info.cookies.find(c => c.name === 'bili_jct')?.value,
                        DedeUserID: data.data.cookie_info.cookies.find(c => c.name === 'DedeUserID')?.value,
                        DedeUserID__ckMd5: data.data.cookie_info.cookies.find(c => c.name === 'DedeUserID__ckMd5')?.value,
                        sid: data.data.cookie_info.cookies.find(c => c.name === 'sid')?.value,
                        refresh_token: data.data.token_info.refresh_token,
                        expires_in: expirationTime * 1000,
                        coin: userCookies.coin,
                        live: userCookies.live,
                    };

                    cookies[DedeUserID] = updatedCookies;
                    refreshedAccounts.push(`账号 ${DedeUserID} 刷新成功，有效期至：${moment(expirationTime * 1000).format('YYYY-MM-DD HH:mm:ss')}`);
                } else {
                    refreshedAccounts.push(`账号 ${DedeUserID} 刷新失败: ${data.message}`);
                    anyFailure = true;
                }
            } catch (error) {
                logger.error("[Bili-plugin]刷新ck报错:", error);
                refreshedAccounts.push(`账号 ${DedeUserID} 未知错误，请稍后再试`);
                anyFailure = true;
            }
            Count++
            if (Count > 0) {
                await Bot.sleep(2000)
            }
        }

        fs.writeFileSync(cookieFile, JSON.stringify(cookies, null, 4));
        const replyMessage = anyFailure ? "部分账号刷新失败。\n" : "所有账号刷新成功。\n";
        try { await e.reply([`${replyMessage}${refreshedAccounts.join('\n')}`, new Button().bind()], true) } catch { await e.reply([`${replyMessage}${refreshedAccounts.join('\n')}`, new Button().bind()]) }
    }
}