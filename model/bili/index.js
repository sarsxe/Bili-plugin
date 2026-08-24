import fetch from "node-fetch";
import moment from 'moment';
import config from '../Config.js';
import BApi from '../BAPI/bapi/index.js';
import QApi from '../BAPI/QAPI.js';
import configModule from "../../../../lib/config/config.js"
import YAML from 'yaml';
import fs from 'fs';
import path from 'path';
import lodash from 'lodash';
import {
    pluginName,
    pluginRoot
} from "../constant.js"
import {
    exec
} from 'child_process'
import net from 'net'
import base from './base.js'
import video from './video.js'
import live from './live.js'
import sign from './sign.js'
import qq from './qq.js'
import info from './info.js'
if (!global.___) global.___ = BApi
let Update = null
try {
    Update = (await import("../../../other/update.js").catch(e => null))?.update
    Update ||= (await import("../../../system/apps/update.ts")).update
} catch (e) {
    logger.error(`[${pluginName}]未获取到更新js ${logger.yellow("更新功能")} 将无法使用`)
}
class Bili {
    constructor() {
        this.key = configModule?.qq?.[0] || Bot.uin || ['114514']
        this.clean = this.clean.bind(this)
        this.Update_Plugin = new Update()
        this.configFilePath = './config/config/other.yaml'
        this.config = this.loadConfig()
    }
}
Object.assign(Bili.prototype, base, video, live, sign, qq, info)
export default new Bili();
