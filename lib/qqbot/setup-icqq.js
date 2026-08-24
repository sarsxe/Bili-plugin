import configs from "../../model/Config.js";

    const setupICQQ = (adapter) => {
        adapter.makeButtons = function(id, pick, button_square, forward) {
            const msgs = [];
            const random = Math.floor(Math.random() * 2)
            const validTypes = (configs.buttonType || [])
                .map(item => Number(item))
                .filter(num => !isNaN(num) && Number.isInteger(num));
            let typeIndex = 0;
            if (validTypes.length > 0) {
                typeIndex = Math.floor(Math.random() * validTypes.length);
            }
            for (const button_row of button_square) {
                const buttons = [];
                for (const button of button_row) {
                    let style
                    if (validTypes.length > 0 && configs.sendbutton) {
                        style = validTypes[typeIndex]
                        typeIndex = (typeIndex + 1) % validTypes.length
                    } else style = (random + msgs.length + buttons.length) % 2
                    const processedButton = this.makeButton(id, pick, button, style, forward)
                    if (processedButton) {
                        buttons.push(processedButton)
                    }
                }
                if (buttons.length > 0) {
                    msgs.push({
                        buttons
                    })
                }
            }
            return msgs
        }
        adapter.sendMsg = async function(id, pick, msg, ...args) {
            const rets = {
                message_id: [],
                data: [],
                error: []
            }
            try {
                const processMessages = async () => {
                    const processed = {
                        buttonMsgs: [],
                        normalMsgs: [],
                        rawMsgs: Array.isArray(msg) ? [...msg] : [msg]
                    }
                    for (const item of processed.rawMsgs) {
                        const type = item?.type;
                        if (type === 'button') {
                            processed.buttonMsgs.push({
                                type: "button",
                                appid: this.markdown_appid,
                                content: {
                                    rows: this.makeButtons(id, pick, item.data)
                                },
                            })
                        } else {
                            processed.normalMsgs.push(item);
                        }
                    }
                    let normalMsgs = await this.makeMsg(id, pick, processed.normalMsgs);
                    if (normalMsgs.length === 0) {
                        return {
                            messages: processed.buttonMsgs,
                        }
                    }
                    if (Array.isArray(normalMsgs) && normalMsgs.length > 0 && Array.isArray(normalMsgs[0]))
                        normalMsgs = normalMsgs[0]

                    return {
                        messages: configs.sendbutton ? [[...normalMsgs], ...processed.buttonMsgs] : normalMsgs,
                    }
                }
                let { messages } = await processMessages()
                const sendMsg = async () => {
                    for (const i of messages) try {
                        Bot.makeLog("debug", ["发送消息", i], id)
                        const ret = await pick.sendMsg(i, ...args)
                        Bot.makeLog("debug", ["发送消息返回", ret], id)
                        rets.data.push(ret)
                        if (ret.message_id)
                            rets.message_id.push(ret.message_id)
                    } catch (err) {
                        rets.error.push(err)
                        return false
                    }
                }
                if (await sendMsg() === false) {
                    messages = await this.makeMsg(id, pick,
                        [await Bot.makeForwardMsg([{ message: messages?.[0] }])])
                    await sendMsg()
                }
                return rets.data.length === 1 ? rets.data[0] : rets
            } catch (error) {
                Bot.makeLog("error", ["消息发送错误", msg, error], id)
                rets.error.push(error)
                return rets
            }
        }
    }

export default setupICQQ
