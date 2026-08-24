import { MakButton as Make, Packet } from "#model"

    const setupNapcat = (adapter) => {
        adapter.makeMsg = async function(msg) {
            if (!Array.isArray(msg))
                msg = [msg]
            const msgs = []
            const forward = []
            const buttons = []
            const longmsg = []
            for (let i of msg) {
                if (typeof i !== "object")
                    i = {
                        type: "text",
                        data: {
                            text: i
                        }
                    }
                else if (!i.data)
                    i = {
                        type: i.type,
                        data: {
                            ...i,
                            type: undefined
                        }
                    }

                switch (i.type) {
                    case "at":
                        i.data.qq = String(i.data.qq)
                        break
                    case "reply":
                        i.data.id = String(i.data.id)
                        break
                    case "button":
                        buttons.push(i)
                        continue
                    case "long_msg":
                        longmsg.push(i.data.resid)
                        continue
                    case "json":
                        i.data.data = JSON.stringify(i.data)
                        break
                    case "node":
                        forward.push(...i.data)
                        continue
                    case "raw":
                        i = i.data
                        break
                }

                if (i.data.file)
                    i.data.file = await this.makeFile(i.data.file)

                msgs.push(i)
            }
            return [msgs, forward, buttons, longmsg]
        }

        adapter.sendFriendMsg = async function(data, msg) {
            data.isGroup = false
            return this.sendMsg(msg, message => {
                Bot.makeLog("info", `发送好友消息：${this.makeLog(message)}`, `${data.self_id} => ${data.user_id}`, true)
                return data.bot.sendApi("send_msg", {
                  user_id: data.user_id,
                  message,
                })
              }, msg => this.sendFriendForwardMsg(data, msg), msg => this.sendButton(data, msg), msg => this.sendlongmsg(data, msg))
        }

        adapter.pokeFriend = async function(data, self = false) {
            Bot.makeLog("info", "发送私聊戳一戳", `${data.self_id} => ${data.user_id}`, true)
            return data.bot.sendApi("send_poke", {
                user_id: self ? data.self_id : data.user_id,
            })
        }

        adapter.searchSameGroup = async function(data, qq = data.user_id) {
            Bot.makeLog("info", "查找机器人与这个人的共群", `${data.self_id} => ${qq}`, true)
            let body = {
                "1": 3316,
                "2": 0,
                "3": 0,
                "4": {
                    "1": data.self_id,
                    "2": qq,
                    "4": 1,
                    "5": [
                        {
                            "3": {
                                "1": data.self_id,
                                "2": qq,
                            },
                            "5": 3436,
                        },
                        {
                            "3": {
                                "1": {
                                    "1": {
                                        "6": `${qq}`,
                                    },
                                    "2": 1,
                                },
                            },
                            "5": 3460,
                        },
                    ],
                    "6": 0,
                },
                "6": "android 8.9.28",
            }
            let res = await Packet.Send(data,"OidbSvc.0xcf4", body)
            if (!res[4][12][1]) {
                return [];
            }
            return res[4][12][1].map((item) => {
                return {
                    groupName: item["3"],
                    Group_Id: item["1"],
                };
            })
        }

        adapter.pickFriend = function(data,  user_id) {
            const i = {
                ...data.bot.fl.get(user_id),
                ...data,
                user_id,
              }
              return {
                ...i,
                sendMsg: this.sendFriendMsg.bind(this, i),
                getMsg: this.getMsg.bind(this, i),
                recallMsg: this.recallMsg.bind(this, i),
                getForwardMsg: this.getForwardMsg.bind(this, i),
                sendForwardMsg: this.sendFriendForwardMsg.bind(this, i),
                sendFile: this.sendFriendFile.bind(this, i),
                getInfo: this.getFriendInfo.bind(this, i),
                poke: self  => this.pokeFriend(i,self),
                searchSameGroup: qq  => this.searchSameGroup(i,qq),
                getAvatarUrl() { return this.avatar || `https://q.qlogo.cn/g?b=qq&s=0&nk=${user_id}` },
                getChatHistory: this.getFriendMsgHistory.bind(this, i),
                thumbUp: this.sendLike.bind(this, i),
                delete: this.deleteFriend.bind(this, i),
              }
        }

        adapter.sendGroupSign = async function(data) {
            Bot.makeLog("info", "群打卡", `${data.self_id} => ${data.group_id}`, true)
            const body = {
                2: {
                    1: String(data.self_id),
                    2: String(data.group_id),
                    3: '9.0.90',
                },
            }
            const rsp = await Packet.sendOidb(data, "OidbSvc.0xeb7_1", body)
            return { result: rsp[3] & 0xffffffff }
        }

        adapter.poke = async function(data,qq) {
            Bot.makeLog("info", "发送群戳一戳", `${data.self_id} => ${data.group_id}`, true)
            const body = {
                1: qq,
                2: data.group_id,
            }
            const rsp = await Packet.sendOidb(data, "OidbSvc.0xed3", body)
            return rsp[3] === 0
        }

        adapter.pickGroup = function(data, group_id) {
            if (typeof group_id === "string" && group_id.match("-")) {
                const guild_id = group_id.split("-")
                const i = {
                  ...data.bot.gl.get(group_id),
                  ...data,
                  guild_id: guild_id[0],
                  channel_id: guild_id[1],
                }
                return {
                  ...i,
                  sendMsg: this.sendGuildMsg.bind(this, i),
                  getMsg: this.getMsg.bind(this, i),
                  recallMsg: this.recallMsg.bind(this, i),
                  getForwardMsg: this.getForwardMsg.bind(this, i),
                  getInfo: this.getGuildInfo.bind(this, i),
                  getChannelArray: this.getGuildChannelArray.bind(this, i),
                  getChannelList: this.getGuildChannelList.bind(this, i),
                  getChannelMap: this.getGuildChannelMap.bind(this, i),
                  getMemberArray: this.getGuildMemberArray.bind(this, i),
                  getMemberList: this.getGuildMemberList.bind(this, i),
                  getMemberMap: this.getGuildMemberMap.bind(this, i),
                  pickMember: this.pickMember.bind(this, i),
                }
              }
          
              const i = {
                ...data.bot.gl.get(group_id),
                ...data,
                group_id,
              }
              return {
                ...i,
                sendMsg: this.sendGroupMsg.bind(this, i),
                getMsg: this.getMsg.bind(this, i),
                recallMsg: this.recallMsg.bind(this, i),
                getForwardMsg: this.getForwardMsg.bind(this, i),
                sendForwardMsg: this.sendGroupForwardMsg.bind(this, i),
                sendFile: (file, name) => this.sendGroupFile(i, file, undefined, name),
                getInfo: this.getGroupInfo.bind(this, i),
                getAvatarUrl() { return this.avatar || `https://p.qlogo.cn/gh/${group_id}/${group_id}/0` },
                getChatHistory: this.getGroupMsgHistory.bind(this, i),
                getHonorInfo: this.getGroupHonorInfo.bind(this, i),
                getEssence: this.getEssenceMsg.bind(this, i),
                getMemberArray: this.getMemberArray.bind(this, i),
                getMemberList: this.getMemberList.bind(this, i),
                getMemberMap: this.getMemberMap.bind(this, i),
                pickMember: this.pickMember.bind(this, i, group_id),
                pokeMember: qq => this.poke(i,qq),
                setName: this.setGroupName.bind(this, i),
                setAvatar: this.setGroupAvatar.bind(this, i),
                setAdmin: this.setGroupAdmin.bind(this, i),
                setCard: this.setGroupCard.bind(this, i),
                setTitle: this.setGroupTitle.bind(this, i),
                sign: this.sendGroupSign.bind(this, i),
                muteMember: this.setGroupBan.bind(this, i),
                muteAll: this.setGroupWholeKick.bind(this, i),
                kickMember: this.setGroupKick.bind(this, i),
                quit: this.setGroupLeave.bind(this, i),
                fs: this.getGroupFs(i),
                get is_owner() { return data.bot.gml.get(group_id)?.get(data.self_id)?.role === "owner" },
                get is_admin() { return data.bot.gml.get(group_id)?.get(data.self_id)?.role === "admin" || this.is_owner },
              }
        }


        adapter.sendGroupMsg = async function(data, msg) {
            data.isGroup = true
            return this.sendMsg(msg, message => {
                Bot.makeLog("info", `发送群消息：${this.makeLog(message)}`, `${data.self_id} => ${data.group_id}`, true)
                return data.bot.sendApi("send_msg", {
                  group_id: data.group_id,
                  message,
                })
              }, msg => this.sendGroupForwardMsg(data, msg), msg => this.sendButton(data, msg), msg => this.sendlongmsg(data, msg))
        }

        adapter.sendlongmsg = async function(data, longmsg) {
            if(data.isGroup) {
                Bot.makeLog("info", `发送群聊长消息：${this.makeLog(longmsg)}`, `${data.self_id} => ${data.group_id}`, true)
              } else {
                Bot.makeLog("info", `发送私聊长消息：${this.makeLog(longmsg)}`, `${data.self_id} => ${data.user_id}`, true)
              }
            let ret = []
             for (const i of longmsg) {
                ret.push(await Packet.SendLong_msg(data, i))
             }
             return ret
        }

        adapter.sendButton = async function(data, buttons) {
           if(data.isGroup) {
             Bot.makeLog("info", `发送群聊按钮消息：${this.makeLog(buttons)}`, `${data.self_id} => ${data.group_id}`, true)
           } else {
             Bot.makeLog("info", `发送私聊按钮消息：${this.makeLog(buttons)}`, `${data.self_id} => ${data.user_id}`, true)
           }
           const buttonData = []
           buttons.forEach(button => {
               if (Array.isArray(button.data)) {
                   buttonData.push(...button.data)
               } else {
                   buttonData.push(button.data)
               }
           })
           const raw = {
               rows: Make.makeButtons(buttonData)
           }
           const packet = Make.button(raw)
           return Packet.Elem(data, packet)
        }

        adapter.sendMsg = async function(msg, send, sendForwardMsg, sendButton, sendlongmsg) {
            const [message, forward, buttons, longmsg] = await this.makeMsg(msg)
            const ret = []
            if (forward.length) {
                const data = await sendForwardMsg(forward)
                if (Array.isArray(data))
                    ret.push(...data)
                else
                    ret.push(data)
            }
            
            if (message.length)
                ret.push(await send(message))

            if (buttons.length) {
               await sendButton(buttons)
            }

            if (longmsg.length) {
               await sendlongmsg(longmsg)
            }
            if (ret.length === 1) return ret[0]

            const message_id = []
            for (const i of ret)
                if (i?.message_id)
                    message_id.push(i.message_id)
            return {
                data: ret,
                message_id
            }
        }
    }


export default setupNapcat
