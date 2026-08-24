<div align="center">

# Bili-plugin

B站多功能 Yunzai 插件 —— 视频解析 / 自动签到 / 直播互动 / 账号管理

[![TRSS-Yunzai](https://img.shields.io/badge/TRSS--Yunzai-v3.1.3-blue)](https://github.com/TimeRainStarSky/Yunzai)
[![Miao-Yunzai](https://img.shields.io/badge/Miao--Yunzai-v3.1.3-green)](https://github.com/yoimiya-kokomi/Miao-Yunzai)
[![License](https://img.shields.io/badge/license-MIT-orange)](LICENSE)

</div>

---

## 功能特性

| 分类 | 功能 |
|------|------|
| **视频解析** | 自动解析聊天中的B站链接，发送视频/封面/简介 |
| **账号管理** | 扫码登录、多账号切换、CK刷新、账号信息查询 |
| **自动签到** | 每日自动签到（投币/分享/观看/漫画/大会员），支持定时任务 |
| **直播互动** | 自动发送弹幕、直播间监听、开播提醒、直播分享 |
| **视频操作** | 点赞/点踩/收藏/评论/一键三连/关注UP主 |
| **QQ增强** | 日签打卡、幸运字符、整点报时、节日推送 |
| **实用工具** | 今日运势、节日查询、娶群友、进群时间查询 |

---

## 安装指南

### 1. 克隆插件

在 Yunzai 根目录执行：

```bash
# GitHub 源
git clone --depth=1 https://github.com/sarsxe/Bili-plugin.git ./plugins/Bili-plugin/

# 网络较差时使用代理
git clone --depth=1 https://gh.xiaohuanya.top/https://github.com/sarsxe/Bili-plugin.git ./plugins/Bili-plugin/
```

### 2. 安装依赖

```bash
pnpm install --filter=bili-plugin
```

### 3. 重启 Yunzai

插件加载成功后，控制台会显示载入信息。

---

## 配置说明

### 锅巴面板（推荐）

安装 [锅巴插件](https://gitee.com/guoba-yunzai/guoba-plugin) 后，在锅巴面板中搜索「B站插件」即可可视化配置所有选项。

### 手动配置

配置文件位于 `plugins/Bili-plugin/config/config.yaml`，主要配置项：

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| `Switchjx` | B站链接自动解析开关 | `true` |
| `SESSDATA` | 默认解析CK（仅SESSDATA字段） | - |
| `maxVideoSizeMB` | 视频发送大小上限（MB） | `15` |
| `cron` | 自动签到定时（cron表达式） | 随机生成 |
| `livecron` | 自动弹幕定时 | 随机生成 |
| `QQDaily` | 日签打卡定时 | 随机生成 |
| `luckywordcron` | 幸运字符定时 | 随机生成 |
| `festivalpush` | 节日推送定时 | 随机生成 |
| `Enable_SignApi` | 是否启用第三方签到API | `false`（本地直连） |
| `switchProxy` | 是否启用代理 | `false` |
| `proxyAddress` | 代理地址 | `http://127.0.0.1:7890` |
| `sendbutton` | 按钮交互模式 | `true` |

---

## 指令列表

### 核心功能

| 指令 | 说明 |
|------|------|
| `#B站登录` | 扫码登录B站账号 |
| `#我的B站` | 查看账号信息 |
| `#B站签到` | 手动执行签到 |
| `#B站全部签到` | 所有账号签到（主人） |
| `#B站签到记录` | 查看签到记录 |
| `#刷新B站ck` | 刷新登录凭证 |
| `#切换B站账号` | 切换当前账号 |
| `#退出B站` | 退出登录 |

### 视频功能

| 指令 | 说明 |
|------|------|
| `（发送B站链接）` | 自动解析视频 |
| `#点赞视频` | 点赞当前视频 |
| `#收藏视频` | 收藏当前视频 |
| `#一键三连` | 点赞+投币+收藏 |
| `#评论视频` | 评论当前视频 |
| `#关注up` | 关注UP主 |
| `#查询up` | 查询UP主信息 |

### 直播功能

| 指令 | 说明 |
|------|------|
| `#向xxx发弹幕xxx` | 向指定直播间发送弹幕 |
| `#开始推送直播间` | 监听直播间消息 |
| `#开启直播间弹幕` | 开启自动弹幕 |
| `#关闭直播间弹幕` | 关闭自动弹幕 |
| `#主播开播了吗` | 查询关注主播开播状态 |

### QQ功能

| 指令 | 说明 |
|------|------|
| `#日签打卡` | QQ日签打卡 |
| `#执行抽幸运字符` | 抽取群幸运字符 |
| `#开启投币` / `#关闭投币` | 签到投币开关 |
| `#开启B站解析` / `#关闭B站解析` | 解析开关 |

### 实用工具

| 指令 | 说明 |
|------|------|
| `#今日运势` | 查看今日运势 |
| `#节日查询` | 查询今日节日 |
| `#进群多久了` | 查询进群时间 |
| `今日老婆` | 娶群友小游戏 |

### 帮助

| 指令 | 说明 |
|------|------|
| `#B站功能` | 完整功能菜单 |
| `#B站视频帮助` | 视频功能帮助 |
| `#B站小功能帮助` | 小功能帮助 |

---

## 目录结构

```
Bili-plugin/
├── index.js              # 插件入口
├── package.json          # 依赖与别名配置
├── guoba.support.js      # 锅巴适配入口
├── guoba/
│   └── index.js          # 锅巴面板配置
├── apps/                 # 指令入口（按功能拆分）
│   ├── Login.js          # 登录管理
│   ├── Sign.js           # 手动签到
│   ├── Allsign.js        # 全部签到
│   ├── Task*.js          # 定时任务（7个独立任务）
│   ├── Switch.js         # 功能开关
│   ├── QQBot.js          # QQBot适配
│   └── ...               # 其他功能模块
├── lib/
│   ├── load/             # 插件加载器
│   └── qqbot/            # QQ适配器扩展
│       ├── setup-napcat.js
│       ├── setup-icqq.js
│       └── setup-qqbot.js
├── model/
│   ├── index.js          # 统一导出
│   ├── Config.js         # 配置管理
│   ├── bili/             # 核心服务层
│   │   ├── index.js      # 聚合导出
│   │   ├── base.js       # 基础工具
│   │   ├── sign.js       # 签到服务
│   │   ├── video.js      # 视频服务
│   │   ├── live.js       # 直播服务
│   │   ├── qq.js         # QQ功能
│   │   └── info.js       # 信息查询
│   └── BAPI/
│       ├── bapi/         # B站API层
│       │   ├── index.js  # 聚合导出
│       │   ├── constants.js  # 共享常量
│       │   ├── auth.js   # 登录认证
│       │   ├── sign.js   # 签到接口
│       │   ├── video.js  # 视频接口
│       │   ├── live.js   # 直播接口
│       │   └── user.js   # 用户接口
│       └── QAPI.js       # QQ接口
├── config/               # 配置文件
├── resources/            # 静态资源
└── data/                 # 运行时数据
```

---

## 常见问题

**Q: 签到提示 `targetUsers is not a function`？**
A: 旧版本插件缺失方法导致，请更新到最新版本。新版本已修复此问题，且签到核心流程为本地直连，不依赖第三方服务。

**Q: 如何关闭自动签到？**
A: 在锅巴面板或 `config.yaml` 中将 `cron` 设置为不可能触发的时间，或删除该配置项。

**Q: 视频解析失败？**
A: 检查 `SESSDATA` 是否配置有效，或确认视频链接格式正确。部分视频需要登录才能解析。

**Q: 如何使用代理？**
A: 在配置中开启 `switchProxy` 并设置 `proxyAddress` 为您的代理地址。

---

## 免责声明

1. 本插件为开源项目，仅供学习交流使用，严禁用于商业用途或违法行为
2. 素材均来源于网络，如有侵权请联系删除
3. 使用本插件产生的任何后果由使用者自行承担
4. 请勿将本插件内容上传至任何视频平台

---

## 致谢

| 项目 | 说明 |
|------|------|
| [TRSS-Yunzai](https://github.com/TimeRainStarSky/Yunzai) | 食欲的 TRSS Yunzai |
| [Miao-Yunzai](https://github.com/yoimiya-kokomi/Miao-Yunzai) | 喵喵的 Miao-Yunzai |
| [TRSS-Plugin](https://gitee.com/TimeRainStarSky/TRSS-Plugin) | 食欲的吴迪插件 |
| [QQBot-Plugin](https://gitee.com/xiaoye12123/Yunzai-QQBot-Plugin) | 小叶的 QQBot 插件 |
| [Packet-plugin](https://gitee.com/HDTianRu/Packet-plugin) | 天如的吴迪插件 |

---

## 联系方式

- QQ群: [470225982](https://qm.qq.com/q/xxx)
- GitHub: [sarsxe/Bili-plugin](https://github.com/sarsxe/Bili-plugin)
