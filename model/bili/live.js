import fetch from "node-fetch";
import moment from "moment";
import config from "../Config.js";
import BApi from "../BAPI/bapi/index.js";
import QApi from "../BAPI/QAPI.js";
import YAML from "yaml";
import fs from "fs";
import path from "path";
import lodash from "lodash";
import { exec } from "child_process";
import net from "net";

export default {
    async localGetLiveInfo(roomId, headers) {
        const apiGet = async (api) => {
            const resp = await fetch(api, { headers });
            const json = await resp.json();
            if (json.code !== 0) throw new Error(`B站直播API错误: ${json.code} ${json.message}`);
            return json.data;
        };

        const info = await apiGet(`https://api.live.bilibili.com/room/v1/Room/get_info?room_id=${roomId}`);
        const anchor = await apiGet(`https://api.live.bilibili.com/live_user/v1/UserInfo/get_anchor_in_room?roomid=${roomId}`).catch(() => null);
        const play = await apiGet(`https://api.live.bilibili.com/room/v1/Room/playUrl?cid=${roomId}&quality=0&platform=web`).catch(() => null);

        let danmu = [];
        try {
            const dm = await apiGet(`https://api.live.bilibili.com/xlive/web-room/v1/dM/gethistory?roomid=${roomId}`);
            danmu = (dm.room || []).slice(0, 10).map(d2 => ({
                nickname: d2.nickname,
                text: d2.text,
                face: '',
                isadmin: false,
                time: d2.timeline || ''
            }));
        } catch (e) {}

        return {
            type: 'live',
            data: {
                cover: info.cover || info.keyframe || '',
                title: info.title,
                uid: info.uid,
                roomid: roomId,
                area_name: info.area_name || '',
                live_status: info.live_status === 1 ? '正在直播' : '未开播',
                live_time: info.live_time || '未开播',
                hot_words: [anchor?.info?.uname ? `主播: ${anchor.info.uname}` : `房间号: ${roomId}`],
                Url: play?.durl?.[0]?.url ?? '',
                danmu
            }
        };
    },

    async liveshare(userCookies, roomid) {
        try {
            let json
            json = await BApi.liveshare(userCookies, roomid)

            return json.code === 0 ? `🌸分享直播间${roomid}成功` : `🌸分享直播间${roomid}失败:${json.message || json.msg || '未知错误'}`;
        } catch (err) {
            logger.error("[Bili-plugin]视频解析失败:", err);
            return `🌸分享直播间${roomid}失败: 未知错误`;
        }
    },

    async liveclick(userCookies, roomid, upid, click = 10, MAX_CLICK_PER_REQUEST = 10) {
        let successTotal = 0;
        let failTotal = 0;
        const errorMessages = new Set();
        const sendClickRequest = async (batchClick) => {
            try {
                let json
                json = await BApi.liveclick(userCookies, roomid, upid, click)


                if (json.code === 0) {
                    return {
                        success: batchClick,
                        error: null
                    };
                } else {
                    const msg = json.message || json.msg || '未知错误';
                    return {
                        success: 0,
                        error: msg
                    };
                }
            } catch (err) {
                logger.error("[Bili-plugin]直播间点赞请求失败:", err);
                return {
                    success: 0,
                    error: "请求异常"
                };
            }
        }
        try {
            let remaining = click;
            while (remaining > 0) {
                const batchClick = Math.min(remaining, MAX_CLICK_PER_REQUEST);
                const {
                    success,
                    error
                } = await sendClickRequest(batchClick);
                successTotal += success;
                failTotal += error ? batchClick : 0;
                if (error) errorMessages.add(error);
                remaining -= batchClick
                await this.sleep(2000)
            }
        } catch (err) {
            logger.error("[Bili-plugin]直播间点赞流程异常:", err);
            return `🌸直播间点赞流程异常: ${err.message}`;
        }
        const successInfo = `🌸成功给直播间${roomid}点赞${successTotal}下`;
        //${Array.from(errorMessages).join('；')}
        const failInfo = failTotal > 0 ?
            `\n🌸其中点赞失败 ${failTotal} 次(未知错误)` :
            '';
        return `${successInfo}${failInfo}`
    },

    async livesenddamu(userCookies, msg, roomid) {
        try {
            let response
            let damu
            damu = await BApi.livesenddamu(userCookies, msg, roomid)

            if (damu.code === 0) {
                return `===========================\n🌸B站账号『${userCookies.DedeUserID}』在直播间『${roomid}』发送弹幕『${msg}』成功`;
            } else {
                return `===========================\n🌸B站账号『${userCookies.DedeUserID}』在直播间『${roomid}』发送弹幕『${msg}』失败\n失败原因:『${damu.message || damu.msg || '未知错误'}』`;
            }
        } catch (err) {
            logger.error("[Bili-plugin]发送弹幕失败", err);
            return `===========================\n🌸B站账号『${userCookies.DedeUserID}』在直播间『${roomid}』发送弹幕『${msg}』失败！！\n失败原因:『请求失败』`;
        }
    },


    async getlivefeed(userCookies) {
        try {
            let response
            let livejson
            livejson = await BApi.getlivefeed(userCookies)

            let livedata = livejson.data?.card_list
                ?.filter(card =>
                    card.card_type === "my_idol_v1" &&
                    Array.isArray(card.card_data?.my_idol_v1?.list)
                )
                .flatMap(card => card.card_data.my_idol_v1.list)
                .map(room => ({
                    roomid: room.roomid || '未知',
                    uid: room.uid || '未知',
                    name: room.uname || '未知',
                    face: room.face,
                    cover: room.cover,
                    title: room.title || '未知',
                    live_time: room.live_time,
                    area_name: room.area_name || '未知',
                    area_v2_name: room.area_v2_name || '未知',
                    area_v2_parent_name: room.area_v2_parent_name || '未知',
                    live_tag_name: room.live_tag_name || '未知',
                    online: room.online || '未知'
                })) || []

            return livedata;
        } catch (err) {
            logger.error("[Bili-plugin]获取用户关注主播开播状态失败", err);
            return [];
        }
    },


}
