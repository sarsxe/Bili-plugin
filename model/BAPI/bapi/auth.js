import { __, pollMap, TempE, CONSTANTS, appKey, appSecret, appheaders } from "./constants.js"
import { createHash } from "node:crypto";
import Qrcode from "qrcode";
import sharp from "sharp";
import config from "../../Config.js";
import { HttpsProxyAgent } from "https-proxy-agent"

export default {
    async getloginqrcode(key, e) {
        try {
            const code = await this.getQrCode();
            const auth_code = code.data.auth_code;
            pollMap[key] = auth_code;
            TempE[key] = e.logFnc;
            const url = code.data.url;
            const avatarUrl = await e.bot.pickFriend(e.user_id).getAvatarUrl();
            function getRandomColor(baseColor = [255, 145, 164], variation = 8) {
                const [baseR, baseG, baseB] = baseColor;
                const r = Math.max(0, Math.min(baseR + Math.floor(Math.random() * (variation * 2 + 1)) - variation, 255))
                    .toString(16)
                    .padStart(2, '0');
                const g = Math.max(0, Math.min(baseG + Math.floor(Math.random() * (variation * 2 + 1)) - variation, 255))
                    .toString(16)
                    .padStart(2, '0');
                const b = Math.max(0, Math.min(baseB + Math.floor(Math.random() * (variation * 2 + 1)) - variation, 255))
                    .toString(16)
                    .padStart(2, '0');
                return `#${r}${g}${b}`;
            }
            const qrBuffer = await Qrcode.toBuffer(url, {
                color: {
                    dark: '#000000',
                    light: getRandomColor()
                },
                margin: 1,
                scale: 10,
                width: 400,
                height: 400
            });

            let avatarImage;
            try {
                const response = await fetch(avatarUrl);
                if (!response.ok) throw new Error('Failed to fetch avatar');
                const arrayBuffer = await response.arrayBuffer();
                avatarImage = Buffer.from(arrayBuffer);
            } catch (error) {
                logger.error('[Bili-plugin]无法获取用户头像', error);
                avatarImage = null;
            }
            const compositeImages = [{ input: qrBuffer }];
            if (avatarImage) {
                const processedAvatar = await sharp(avatarImage)
                    .resize(120, 120)
                    .toBuffer();
                
                compositeImages.push({
                    input: processedAvatar,
                    left: 140,
                    top: 140,
                    blend: 'over'
                });
            }
            const finalImage = await sharp({
                    create: {
                        width: 400,
                        height: 400,
                        channels: 4,
                        background: { r: 255, g: 255, b: 255, alpha: 0 }
                    }
                })
                .composite(compositeImages)
                .png()
                .toBuffer()
            const base64String = finalImage.toString('base64');
            logger.mark(`${e.logFnc} ${logger.blue(JSON.stringify(code))}`)
            return {
                code: 0,
                msg: "ok",
                data: {
                    base64: `base64://${base64String}`,
                    auth_code: auth_code,
                    loginurl: url
                }
            }
        } catch (error) {
            logger.error('[Bili-plugin] 获取登录二维码失败', error);
            return {
                code: -1,
                msg: error.message || "QR code generation failed",
                data: null
            };
        }
    },

    async pollQrCode(key) {
        let auth_code = pollMap[key]
        const params = {
            auth_code,
            local_id: 0,
            ts: Math.floor(Date.now() / 1000),
        }
        const qrCodeStatus = await this._fetchRequest({
            url: CONSTANTS.pollCodeURL,
            method: 'POST',
            params,
            extraHeaders: {
              'referer': 'https://www.bilibili.com/'
            },
            signKey: "783bbb7264451d82",
            signSecret: "2653583c8873dea268ab9386918b1d65"
        })
        if (qrCodeStatus.code === 0 && qrCodeStatus.data && qrCodeStatus.data.access_token) {
            let logFnc = TempE[key]
            logger.mark(`${logFnc} ${logger.blue(JSON.stringify(qrCodeStatus))}`)
            const accessToken = qrCodeStatus.data.access_token;
            const refreshToken = qrCodeStatus.data.refresh_token;
            const mid = qrCodeStatus.data.token_info.mid;
            const expiresIn = qrCodeStatus.data.token_info.expires_in;
            const cookieNames = ['SESSDATA', 'bili_jct', 'DedeUserID', 'sid', 'DedeUserID__ckMd5'];
            const cookieString = qrCodeStatus.data.cookie_info.cookies
                .filter(cookie => cookieNames.includes(cookie.name))
                .map(cookie => `${cookie.name}=${cookie.value}`)
                .concat(`access_key=${accessToken}`)
                .join('; ');
            const responseData = {
                code: 0,
                msg: "ok",
                data: {
                    mid,
                    expires_in: expiresIn,
                    cookie: cookieString,
                    refresh_token: refreshToken
                }
            }
            return responseData
        } else {
            return qrCodeStatus
        }
    },

    async isTRSs() {
      return __ || []
    },
    
    async getQrCode() {
        const params = {
            local_id: 0,
            ts: Math.floor(Date.now() / 1000),
        }
        return this._fetchRequest({
            url: CONSTANTS.QrCodeURL,
            method: 'POST',
            params,
            extraHeaders: {
              'referer': 'https://www.bilibili.com/'
              },
            signKey: "783bbb7264451d82",
            signSecret: "2653583c8873dea268ab9386918b1d65"
        })
    },

      async refresh(accessKey,refresh_token) {
        const params = {
            access_key: accessKey,
            refresh_token: refresh_token,
            ts: Math.floor(Date.now() / 1000),
        }

        return this._fetchRequest({
            url: CONSTANTS.refreshUrl,
            method: 'POST',
            params,
            signKey: "783bbb7264451d82",
            signSecret: "2653583c8873dea268ab9386918b1d65"
        })
    },
    
     async _fetchRequest({
        url,
        method = 'GET',
        params = {},
        bodyParams = null,
        signKey = appKey,
        signSecret = appSecret,
        needSign = true,
        extraHeaders = {}
      }) {
        try {
          const finalParams = { ...params }
          if (needSign) {
            finalParams.appkey = signKey;
            const signParams = new URLSearchParams(finalParams);
            signParams.sort();
            finalParams.sign = createHash('md5')
              .update(signParams.toString() + signSecret)
              .digest('hex');
          }
          const headers = { ...appheaders, ...extraHeaders };
          const requestOptions = {
            method,
            headers,
            body: null
          }
          
          if (config.switchProxy) {
            const agent = new HttpsProxyAgent(config.proxyAddress);
            agent.timeout = 5000
            agent.on('error', (err) => {
              logger.error('[Bili-plugin] 代理连接错误:', err);
            });
            requestOptions.agent = agent
            logger.debug(`[Bili-plugin] 代理已启用 → ${config.proxyAddress}`);
          }

          if (method === 'POST') {
            requestOptions.body = new URLSearchParams(bodyParams || finalParams).toString();
          }
    
          const urlObj = new URL(url);
          urlObj.search = new URLSearchParams(finalParams).toString();
    
          const response = await fetch(urlObj.toString(), requestOptions);
          return await response.json();
        } catch (error) {
          logger.error('[Bili-plugin]请求B站API失败:', error)
          return {
            code: -1,
            msg: '请求B站API失败(可能是你IP被拉黑)',
            error: error.message
          };
        }
      },
    

}
