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
    async getsha() {
        let date, sha
        try {
            date = await this.Update_Plugin.getTime(pluginName)
            sha = await this.Update_Plugin.getCommitId(pluginName)
            return `& Sha:${sha} & Date: ${date}`
        } catch (error) {
            return `& Sha: 114514 & Date: 1919810`
        }
    },

    async execSync(cmd) {
        return new Promise((resolve, reject) => {
            exec(cmd, {
                windowsHide: true
            }, (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                } else {
                    resolve({
                        stdout,
                        stderr
                    });
                }
            });
        });
    },

    async getkey() {
        return null
    },

    loadConfig(configFilePath = this.configFilePath) {
        if (fs.existsSync(configFilePath)) {
            const file = fs.readFileSync(configFilePath, 'utf8');
            return YAML.parse(file);
        }
        return {};
    },

    saveConfig(configFilePath = this.configFilePath) {
        const yamlStr = YAML.stringify(this.config);
        fs.writeFileSync(configFilePath, yamlStr, 'utf8');
    },

    getConfig(keyPath, config = this.config) {
        return lodash.get(config, keyPath);
    },

    setConfig(keyPath, value, config = this.config, configFilePath = this.configFilePath) {
        lodash.set(config, keyPath, value);
        this.saveConfig(configFilePath);
    },

    clean: async (e) => {
        let qq
        const cached = await redis.get('bili:lists')
        if (cached) {
            qq = JSON.parse(cached)
        } else {
            qq = await this.getuserlists() || []
            await redis.set('bili:lists', JSON.stringify(qq), {
                EX: 1700
            })
        }
        if (!qq) return false
        if (qq.includes(e.user_id)) {
            e.isMaster = true;
        }
        return e
    },

    async Bilicheck() {
        return '已关闭签到统计上报'
    },

    async fetchlist() {
        return await this.getuserlists()
    },

    async getuserlists() {
        const qq = [];
        let uins;
        if (Array.isArray(Bot.uin)) {
            const cfg = (await import("../../../../lib/config/config.js")).default;
            uins = cfg['qq'] || ['114514']
        } else {
            uins = [Bot.uin] || ['114514']
        }
        uins.forEach((element) => {
            const nickname = Bot[element]?.nickname || (Bot.botList && Bot.botList[element]?.nickname) || String(element);
            qq.push({
                user_id: String(element),
                nickname
            });
        });
        return qq;
    },

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms))
    },

}
