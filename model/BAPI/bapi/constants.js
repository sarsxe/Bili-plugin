import __ from "data:text/javascript;charset=utf-8,export%20default%20%5B'PqdSkJZ5PcaQrKjIoZ%2BjQA%3D%3D'%2C'N6Z5HAibyfuT1lBT%2BIRCjA%3D%3D'%2C'fDnde3%2FebYIEuIrsjlIDCw%3D%3D'%2C'jJqhF5v7eKE81GCy%2BdFQ%2FA%3D%3D'%2C'Eej%2BPtKxUMl%2B9c6jM2vegg%3D%3D'%2C'CA%2BuFgJZNsGZC2huxIg17g%3D%3D'%2C'DruDRy7U2xPifujfc7wb2g%3D%3D'%2C'MwfcZUKPGbP13Wk2L38dAw%3D%3D'%2C'huyS2gwBfVNU2oXVyAl9pg%3D%3D'%2C'puDsORQEYEsybrQsrcUt7Q%3D%3D'%2C'bQa1RQX2LvHOmb%2BgzZa%2Bfg%3D%3D'%5D.map(item%20%3D%3E%20Buffer.from(item%2C%20'base64').toString('hex'))"
import {createHash} from 'node:crypto';
import Qrcode from 'qrcode';
import sharp from 'sharp';
import config from '../../Config.js';
import { HttpsProxyAgent } from "https-proxy-agent"
export let pollMap = {}
export let TempE = {}
export const CONSTANTS = {
    likeApiUrl: 'https://app.bilibili.com/x/v2/view/like',
    dislikeApiUrl: 'https://app.bilibili.com/x/v2/view/dislike',
    replyApiUrl: 'https://api.bilibili.com/x/v2/reply/add',
    shareApiUrl: 'https://api.bilibili.com/x/share/finish',
    reportApiUrl: 'https://api.bilibili.com/x/v2/history/report',
    addCoinApiUrl: 'https://app.bilibili.com/x/v2/view/coin/add',
    unfavApiUrl: 'https://api.bilibili.com/x/v3/fav/resource/unfav-all',
    experienceApiUrl: 'https://api.bilibili.com/x/vip/experience/add',
    privUrl: 'https://api.bilibili.com/x/vip/privilege/receive',
    mangaClockInUrl: 'https://manga.bilibili.com/twirp/activity.v1.Activity/ClockIn',
    mangaShareUrl: 'https://manga.bilibili.com/twirp/activity.v1.Activity/ShareComic',
    tripleUrl: 'https://app.bilibili.com/x/v2/view/like/triple',
    refreshUrl: 'https://passport.bilibili.com/x/passport-login/oauth2/refresh_token',
    danmuApiUrl: 'https://api.live.bilibili.com/xlive/app-room/v1/dM/sendmsg',
    favApiUrl: 'https://api.biliapi.net/x/v3/fav/resource/batch-deal',
    spaceApiUrl: 'https://app.bilibili.com/x/v2/space',
    explogApiUrl: 'https://api.bilibili.com/x/member/web/exp/log',
    explog2ApiUrl: 'https://api.bilibili.com/x/member/web/exp/reward', 
    myinfoApiUrl: 'https://api.bilibili.com/x/space/myinfo',
    info2ApiUrl: 'https://app.bilibili.com/x/v2/account/myinfo', 
    livedamuApiUrl: 'https://api.live.bilibili.com/xlive/app-room/v1/dM/gethistory', 
    feed2ApiUrl: 'https://app.bilibili.com/x/v2/feed/index/story',
    relaApiUrl: 'https://api.bilibili.com/x/relation/modify',
    livelikeApiUrl: 'https://api.live.bilibili.com/xlive/app-ucenter/v1/like_info_v3/like/likeReportV3',
    livefeedApiUrl: 'https://api.live.bilibili.com/xlive/app-interface/v2/index/feed',
    userinfoApiUrl: 'https://api.vc.bilibili.com/x/im/user_infos',
    QrCodeURL: 'https://passport.snm0516.aisee.tv/x/passport-tv-login/qrcode/auth_code',
    pollCodeURL: 'https://passport.snm0516.aisee.tv/x/passport-tv-login/qrcode/poll'
};

export const appKey = '1d8b6e7d45233436'
export const appSecret = '560c52ccd288fed045859ed18bffd973'
export const appheaders = {
    'Host': 'api.bilibili.com',
    'buvid': 'XU4C85241BF18FBC9C5C20CA1D08F38937711',
    'User-Agent': 'Mozilla/5.0 BiliDroid/8.2.0 (bbcallen@gmail.com) os/android model/NTH-AN00 mobi_app/android build/8020300 channel/yingyongbao innerVer/8020300 osVer/12 network/2',
    'Content-Type': 'application/x-www-form-urlencoded',
    'fp_local': 'ce14fc8255de098acb8c4f83e245543820250121175935cc89db065489232e72',
    'fp_remote': 'ce14fc8255de098acb8c4f83e245543820250121175935cc89db065489232e72',
    'session_id': '3d5cec47',
    'guestid': '24145498840755'
}

export { __ }
