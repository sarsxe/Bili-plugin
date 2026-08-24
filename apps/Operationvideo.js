import fs from 'fs';
import path from 'path';
import { Bili as Bili, Button as Button} from "#model"
export class Bilivideoop extends plugin {
    constructor() {
        super({
            name: "Bili:快捷操作视频",
            desc: "简单快捷视频操作",
            event: "message",
            priority: Number.MIN_SAFE_INTEGER,
            rule: [{
                reg: /^#?(B|b|币|逼|比|🖊|毕|哔|必|壁)?(站|瞻|蘸|占|战|斩|展|沾|栈|湛)?(点赞|评论|收藏|取消收藏|点踩|取消点赞|不喜欢|一键三连)视频/,
                fnc: "Operationvideo"
            }]
        });
    }
    async Operationvideo(e) {
        try {
            const cookiesFilePath = path.join('./data/bili', `${String(e.user_id).replace(/:/g, '_').trim()}.json`);
            if (!fs.existsSync(cookiesFilePath)) {
              return await e.reply(["未绑定ck，请发送【哔站登录】进行绑定", new Button().bind()])
            }
            const cookiesData = JSON.parse(fs.readFileSync(cookiesFilePath, 'utf-8'));
            const userIds = Object.keys(cookiesData);
            if (userIds.length === 0) {
                return await e.reply(["您的登录已过期，请先发送【哔站登录】重新进行绑定", new Button().bind()])
              }
            let currentUserId = await redis.get(`bili:userset:${String(e.user_id).replace(/:/g, '_').trim()}`);
            if (!userIds.includes(currentUserId)) {
              currentUserId = userIds[0];
              await redis.set(`bili:userset:${String(e.user_id).replace(/:/g, '_').trim()}`, currentUserId);
            }
          const userCookies = cookiesData[currentUserId];
          const videoUrl = await Bili.getvideourl(e)
          if(!videoUrl){
            await e.reply(["获取资源失败，请确保正确引用消息！！", new Button().Operate()])
            return
          }
        const videoinfo = await Bili.getvideoinfo(videoUrl,userCookies.SESSDATA)
        if (videoinfo.type === 'video') {
            const aid = videoinfo.data.avid
            const cid = videoinfo.data.cid
            const operationMap = {
                '点赞': async () => await Bili.likevideo(userCookies, aid, 0),
                '取消点赞': async () => await Bili.likevideo(userCookies, aid, 1),
                '点踩': async () => await Bili.dislikevideo(userCookies, aid),
                '不喜欢': async () => await Bili.dislikevideo(userCookies, aid),
                '收藏': async () => await Bili.favvideo(userCookies, aid),
                '取消收藏': async () => await Bili.unfavvideo(userCookies, aid),
                '一键三连': async () => await Bili.triplevideo(userCookies, aid),
                '评论': async () => {
                    const message = e.msg.replace(/#?(B|b|币|逼|比|🖊|毕|哔|必|壁)?(站|瞻|蘸|占|战|斩|展|沾|栈|湛)?评论视频/g, '').trim();
                    if (!message) return "评论内容不能为空哦~";
                    return await Bili.replyvideo(userCookies, aid, message);
                }
            };
            const match = e.msg.match(/点赞|取消点赞|点踩|不喜欢|收藏|取消收藏|一键三连|评论/);
            if (!match) {
                return await e.reply(["未识别到有效操作，请检查输入~", new Button().Operate()]);
            }
            const operation = match[0]
            const func = operationMap[operation];
            if (!func) {
                return await e.reply(["暂不支持该操作！", new Button().Operate()]);
            }
            const res = await func();
            await e.reply([res, new Button().Operate()]);
        }else{
            e.reply(["你引用的不是视频啦~不能帮你完成操作惹TAT", new Button().Operate()])
        }
        } catch (err) {
            logger.error("[Bili-plugin]视频操作失败：", err)
            e.reply("出错惹TAT看看日志吧~",true)
        }
    }
}