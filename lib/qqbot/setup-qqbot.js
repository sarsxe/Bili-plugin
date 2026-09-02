const linkRegExp = /(?<!\[[^\]]*\]\()(?:https?:\/\/)?[-\w]+(?:\.[-\w]+)+(?:[-\w.,@?^=%&:/~+#]*[-\w@?^=%&/~+#])?/g

const upperLinkDomain = text => {
    if (typeof text !== 'string' || !text) return text
    const match = text.match(linkRegExp)
    if (!match) return text
    for (const url of match) {
        const modifiedUrl = url.replace(
            /\.[a-z]{2,}(?=[/?]|$)/gi,
            match => match.toUpperCase()
        )
        text = text.replace(url, modifiedUrl)
    }
    return text
}

const patchModernTextSegment = segment => {
    const text = segment?.text ?? segment?.data?.text
    const modifiedText = upperLinkDomain(text)
    if (modifiedText === text) return segment
    if (typeof segment.text === 'string') segment.text = modifiedText
    if (typeof segment?.data?.text === 'string') segment.data.text = modifiedText
    return segment
}

const setupModernQQBot = adapter => {
    const converter = adapter?.converter
    if (!converter || converter.__biliQQBotLinkPatched) return

    for (const method of ['makeMsg', 'makeRawMarkdownMsg', 'makeGuildMsg']) {
        const original = converter[method]?.bind(converter)
        if (!original) continue
        converter[method] = async (...args) => {
            const messages = await original(...args)
            for (const message of Array.isArray(messages) ? messages : [messages]) {
                const segments = Array.isArray(message) ? message : [message]
                for (let index = 0; index < segments.length; index++) {
                    const segment = segments[index]
                    if (segment?.type === 'text') {
                        patchModernTextSegment(segment)
                        continue
                    }
                    if (segment?.type === 'markdown') {
                        const content = segment?.content ?? segment?.data?.content
                        const modifiedContent = upperLinkDomain(content)
                        if (modifiedContent === content) continue
                        const markdownText = {
                            type: 'text',
                            data: { text: modifiedContent }
                        }
                        if (Array.isArray(message)) message[index] = markdownText
                        else messages[messages.indexOf(message)] = [markdownText]
                    }
                }
            }
            return messages
        }
    }
    converter.__biliQQBotLinkPatched = true
}

const setupLegacyQQBot = (adapter, QQBotconfig) => {
    if (adapter.__biliLegacyQQBotLinkPatched) return
    adapter.makeMsg = async function(data, msg) {
        const sendType = ['audio', 'image', 'video', 'file']
        const messages = []
        const button = []
        let message = []
        let reply
        let { Runtime, Handler, config } = QQBotconfig
        for (let i of Array.isArray(msg) ? msg : [msg]) {
            if (typeof i == 'object') {
                i = {
                    ...i
                }
            } else {
                i = {
                    type: 'text',
                    text: i
                }
            }
            switch (i.type) {
                case 'at':
                    continue
                case 'text':
                case 'face':
                case 'ark':
                case 'embed':
                    break
                case 'record':
                    i.type = 'audio'
                    i.file = await this.makeRecord(i.file)
                case 'video':
                case 'image':
                    if (message.some(s => sendType.includes(s.type))) {
                        messages.push(message)
                        message = []
                    }
                    break
                case 'file':
                    return []
                case 'reply':
                    if (i.id.startsWith('event_')) {
                        reply = {
                            type: 'reply',
                            event_id: i.id.replace(/^event_/, '')
                        }
                    } else {
                        reply = i
                    }
                    continue
                case 'markdown':
                    if (typeof i.data == 'object') {
                        i = {
                            type: 'markdown',
                            ...i.data
                        }
                    } else {
                        i = {
                            type: 'markdown',
                            content: i.data
                        }
                    }
                    break
                case 'button':
                    config.sendButton && button.push(...this.makeButtons(data, i.data))
                    continue
                case 'node':
                    if (Handler.has('ws.tool.toImg') && config.toImg) {
                        const e = {
                            reply: (msg) => {
                                i = msg
                            },
                            user_id: data.bot.uin,
                            nickname: data.bot.nickname
                        }
                        e.runtime = new Runtime(e)
                        await Handler.call('ws.tool.toImg', e, i.data)
                        if (message.some(s => sendType.includes(s.type))) {
                            messages.push(message)
                            message = []
                        }
                    } else {
                        for (const {
                                message
                            }
                            of i.data) {
                            messages.push(...(await this.makeMsg(data, message)))
                        }
                    }
                    break
                case 'raw':
                    if (Array.isArray(i.data)) {
                        messages.push(i.data)
                        continue
                    }
                    i = i.data
                    break
                default:
                    i = {
                        type: 'text',
                        text: JSON.stringify(i)
                    }
            }
            if (i.type === 'text' && i.text) {
                i.text = upperLinkDomain(i.text)
            }
            if (i.type !== 'node') message.push(i)
        }
        if (message.length) {
            messages.push(message)
        }
        while (button.length) {
            messages.push([{
                type: 'keyboard',
                content: {
                    rows: button.splice(0, 5)
                }
            }])
        }
        if (reply) {
            for (const i of messages) i.unshift(reply)
        }
        return messages
    }
    adapter.__biliLegacyQQBotLinkPatched = true
}

const setupQQBot = (adapter, QQBotconfig = null) => {
    if (QQBotconfig?.Runtime && QQBotconfig?.Handler && QQBotconfig?.config) {
        setupLegacyQQBot(adapter, QQBotconfig)
        return
    }
    setupModernQQBot(adapter)
}

export default setupQQBot
