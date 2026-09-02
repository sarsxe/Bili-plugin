import { Config as config } from "#model"

const filePath = config.filePath
const currentCfg = config.loadYAML(filePath) || {}

export function supportGuoba() {
  return {
    pluginInfo: {
      name: 'Bili-plugin',
      title: 'bili-(゜-゜)つロ 干杯~',
      author: 'sarsxe',
      authorLink: 'https://github.com/sarsxe',
      link: 'https://github.com/sarsxe/Bili-plugin',
      isV3: true,
      isV2: false,
      description: 'B站多功能插件：视频解析、签到、账号管理等',
      showInMenu: 'auto',
      icon: 'thesvg-color:bilibili',
      iconColor: '#00a1d6'
    },
    configInfo: {
      schemas: [
        { label: '功能开关', component: 'SOFT_GROUP_BEGIN' },
        {
          field: 'Switchjx',
          label: 'B站解析',
          bottomHelpMessage: '开启后自动解析聊天中的B站链接',
          component: 'Switch'
        },
        {
          field: 'sendbutton',
          label: '按钮模式',
          bottomHelpMessage: '开启后部分功能使用按钮交互',
          component: 'Switch'
        },
        {
          field: 'QQBotsendlink',
          label: 'QQBot直发链接',
          bottomHelpMessage: 'QQBot适配器直接发送链接',
          component: 'Switch'
        },
        {
          field: 'Napsendtext',
          label: 'Napcat文本模式',
          bottomHelpMessage: 'Napcat适配器使用纯文本发送',
          component: 'Switch'
        },
        {
          field: 'ICQQsendfacetext',
          label: 'ICQQ表情文本',
          bottomHelpMessage: 'ICQQ适配器表情转文本发送',
          component: 'Switch'
        },
        { label: '视频解析', component: 'SOFT_GROUP_BEGIN' },
        {
          field: 'SESSDATA',
          label: '默认解析CK',
          bottomHelpMessage: '仅填写SESSDATA字段，用于未登录用户的视频解析',
          component: 'InputTextArea',
          componentProps: { placeholder: 'SESSDATA=xxx', rows: 2 }
        },
        {
          field: 'maxVideoSizeMB',
          label: '视频大小上限',
          bottomHelpMessage: '单位：MB，超过此大小的视频不发送',
          component: 'InputNumber',
          componentProps: { min: 1, max: 200, placeholder: '75' }
        },
        { label: '定时任务', component: 'SOFT_GROUP_BEGIN' },
        {
          field: 'cron',
          label: '签到定时',
          bottomHelpMessage: 'B站自动签到的Cron表达式，重启生效',
          component: 'EasyCron',
          componentProps: { placeholder: '请输入Cron表达式' }
        },
        {
          field: 'livecron',
          label: '弹幕定时',
          bottomHelpMessage: '自动发送直播弹幕的Cron表达式，重启生效',
          component: 'EasyCron',
          componentProps: { placeholder: '请输入Cron表达式' }
        },
        {
          field: 'QQDaily',
          label: '日签定时',
          bottomHelpMessage: 'QQ日签打卡的Cron表达式，重启生效',
          component: 'EasyCron',
          componentProps: { placeholder: '请输入Cron表达式' }
        },
        {
          field: 'luckywordcron',
          label: '幸运字符定时',
          bottomHelpMessage: '自动抽幸运字符的Cron表达式，重启生效',
          component: 'EasyCron',
          componentProps: { placeholder: '请输入Cron表达式' }
        },
        {
          field: 'festivalpush',
          label: '节日推送定时',
          bottomHelpMessage: '自动节日推送的Cron表达式，重启生效',
          component: 'EasyCron',
          componentProps: { placeholder: '请输入Cron表达式' }
        },
        { label: '代理配置', component: 'SOFT_GROUP_BEGIN' },
        {
          field: 'switchProxy',
          label: '启用代理',
          bottomHelpMessage: '开启后B站请求走代理',
          component: 'Switch'
        },
        {
          field: 'proxyAddress',
          label: '代理地址',
          bottomHelpMessage: 'HTTP代理地址',
          component: 'Input',
          componentProps: { placeholder: 'http://127.0.0.1:7890' }
        },
        { label: '其他配置', component: 'SOFT_GROUP_BEGIN' },
        {
          field: 'baoshiapi',
          label: '报时语音API',
          bottomHelpMessage: '整点报时的语音文件地址',
          component: 'Input'
        },
        {
          field: 'yiyan',
          label: '一言API',
          bottomHelpMessage: '一言句子接口地址',
          component: 'Input',
          componentProps: { placeholder: 'https://v1.hitokoto.cn/?encode=text' }
        },
        {
          field: 'whoisMyWifecdTime',
          label: '老婆冷却时间',
          bottomHelpMessage: '单位：秒',
          component: 'InputNumber',
          componentProps: { min: 0, placeholder: '300' }
        },
        {
          field: 'whoisMyWifecacheTime',
          label: '老婆缓存时间',
          bottomHelpMessage: '单位：秒',
          component: 'InputNumber',
          componentProps: { min: 0, placeholder: '3600' }
        },
        {
          field: 'whoisMyWifemaxMembers',
          label: '老婆最大人数',
          bottomHelpMessage: '群老婆列表最大成员数',
          component: 'InputNumber',
          componentProps: { min: 1, max: 50, placeholder: '5' }
        },
        { label: '名单配置', component: 'SOFT_GROUP_BEGIN' },
        {
          field: 'isluckywordBots',
          label: '幸运字符Bot名单',
          bottomHelpMessage: '参与抽幸运字符的机器人QQ号，每行一个',
          component: 'InputTextArea',
          componentProps: { placeholder: '每行一个QQ号', rows: 3 }
        },
        {
          field: 'luckywordwhites',
          label: '幸运字符白名单群',
          bottomHelpMessage: '允许抽幸运字符的群号，每行一个',
          component: 'InputTextArea',
          componentProps: { placeholder: '每行一个群号', rows: 3 }
        },
        {
          field: 'luckywordblacks',
          label: '幸运字符黑名单群',
          bottomHelpMessage: '禁止抽幸运字符的群号，每行一个',
          component: 'InputTextArea',
          componentProps: { placeholder: '每行一个群号', rows: 3 }
        },
        {
          field: 'festivalgroup',
          label: '节日推送群',
          bottomHelpMessage: '接收节日推送的群号，每行一个',
          component: 'InputTextArea',
          componentProps: { placeholder: '每行一个群号', rows: 3 }
        },
        {
          field: 'baoshigroup',
          label: '报时推送群',
          bottomHelpMessage: '接收整点报时的群号，每行一个',
          component: 'InputTextArea',
          componentProps: { placeholder: '每行一个群号', rows: 3 }
        },
        { label: '高级配置', component: 'SOFT_GROUP_BEGIN' },
        {
          field: 'buttonType',
          label: '按钮类型',
          bottomHelpMessage: '启用的按钮类型，每行一个（0/1/3/4）',
          component: 'InputTextArea',
          componentProps: { placeholder: '0\n1\n3\n4', rows: 3 }
        },
        {
          field: 'totalApi',
          label: '总API地址',
          bottomHelpMessage: '插件总API服务地址',
          component: 'Input',
          componentProps: { placeholder: 'http://127.0.0.1' }
        }
      ],
      getConfigData() {
        const cfg = config.loadYAML(filePath) || {}
        return {
          'Switchjx': cfg.Switchjx !== false,
          'sendbutton': cfg.sendbutton !== false,
          'QQBotsendlink': cfg.QQBotsendlink !== false,
          'Napsendtext': cfg.Napsendtext || false,
          'ICQQsendfacetext': cfg.ICQQsendfacetext || false,
          'SESSDATA': cfg.SESSDATA || '',
          'maxVideoSizeMB': Number(cfg.maxVideoSizeMB) || 15,
          'cron': cfg.cron || '',
          'livecron': cfg.livecron || '',
          'QQDaily': cfg.QQDaily || '',
          'luckywordcron': cfg.luckywordcron || '',
          'festivalpush': cfg.festivalpush || '',
          'switchProxy': cfg.switchProxy || false,
          'proxyAddress': cfg.proxyAddress || 'http://127.0.0.1:7890',
          'baoshiapi': cfg.baoshiapi || '',
          'yiyan': cfg.yiyan || 'https://v1.hitokoto.cn/?encode=text',
          'whoisMyWifecdTime': cfg.whoisMyWifecdTime || 300,
          'whoisMyWifecacheTime': cfg.whoisMyWifecacheTime || 3600,
          'whoisMyWifemaxMembers': cfg.whoisMyWifemaxMembers || 5,
          'isluckywordBots': (cfg.isluckywordBots || []).join('\n'),
          'luckywordwhites': (cfg.luckywordwhites || []).join('\n'),
          'luckywordblacks': (cfg.luckywordblacks || []).join('\n'),
          'festivalgroup': (cfg.festivalgroup || []).join('\n'),
          'baoshigroup': (cfg.baoshigroup || []).join('\n'),
          'buttonType': (cfg.buttonType || []).join('\n'),
          'totalApi': cfg.totalApi || 'http://127.0.0.1'
        }
      },
      setConfigData(data, { Result }) {
        try {
          const cfg = config.loadYAML(filePath) || {}
          const arrayFields = ['isluckywordBots', 'luckywordwhites', 'luckywordblacks', 'festivalgroup', 'baoshigroup', 'buttonType']
          for (const [key, value] of Object.entries(data)) {
            if (value === undefined) continue
            if (arrayFields.includes(key)) {
              cfg[key] = String(value).split('\n').map(s => s.trim()).filter(s => s !== '')
            } else {
              cfg[key] = value
            }
          }
          config.saveConfig(filePath, cfg)
          return Result.ok({}, '保存成功')
        } catch (e) {
          return Result.error('保存失败：' + e.message)
        }
      }
    }
  }
}
