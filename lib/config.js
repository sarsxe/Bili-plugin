import YAML from 'yaml'
import fs from 'fs'
import path from 'path'
import { pluginRoot } from '../model/constant.js'

const CONFIG_FILE = path.join(pluginRoot, 'config', 'config.yaml')
const COOKIE_DIR = './data/bili'

/** 配置分组字段映射：field 路径 <-> 旧扁平字段（兼容旧配置） */
const FIELD_MAP = {
  'switch.jx': 'Switchjx',
  'switch.button': 'sendbutton',
  'switch.QQBotLink': 'QQBotsendlink',
  'switch.NapText': 'Napsendtext',
  'switch.ICQQFaceText': 'ICQQsendfacetext',
  'parse.ck': 'SESSDATA',
  'parse.maxVideoSizeMB': 'maxVideoSizeMB',
  'cron.sign': 'cron',
  'cron.danmu': 'livecron',
  'cron.daily': 'QQDaily',
  'cron.luckyword': 'luckywordcron',
  'cron.festival': 'festivalpush',
  'proxy.enabled': 'switchProxy',
  'proxy.address': 'proxyAddress',
  'misc.baoshiApi': 'baoshiapi',
  'misc.yiyan': 'yiyan',
  'misc.wifeCdTime': 'whoisMyWifecdTime',
  'misc.wifeCacheTime': 'whoisMyWifecacheTime',
  'misc.wifeMaxMembers': 'whoisMyWifemaxMembers',
  'list.luckywordBots': 'isluckywordBots',
  'list.luckywordWhites': 'luckywordwhites',
  'list.luckywordBlacks': 'luckywordblacks',
  'list.festivalGroup': 'festivalgroup',
  'list.baoshiGroup': 'baoshigroup',
  'list.buttonType': 'buttonType',
  'advanced.totalApi': 'totalApi'
}

const DEFAULTS = {
  'switch.jx': true,
  'switch.button': true,
  'switch.QQBotLink': true,
  'switch.NapText': false,
  'switch.ICQQFaceText': false,
  'parse.ck': '',
  'parse.maxVideoSizeMB': 15,
  'cron.sign': '',
  'cron.danmu': '',
  'cron.daily': '',
  'cron.luckyword': '',
  'cron.festival': '',
  'proxy.enabled': false,
  'proxy.address': 'http://127.0.0.1:7890',
  'misc.baoshiApi': '',
  'misc.yiyan': 'https://v1.hitokoto.cn/?encode=text',
  'misc.wifeCdTime': 300,
  'misc.wifeCacheTime': 3600,
  'misc.wifeMaxMembers': 5,
  'list.luckywordBots': [],
  'list.luckywordWhites': [],
  'list.luckywordBlacks': [],
  'list.festivalGroup': [],
  'list.baoshiGroup': [],
  'list.buttonType': ['0', '1', '3', '4'],
  'advanced.totalApi': 'http://127.0.0.1'
}

function loadYAML(filePath) {
  try { return YAML.parse(fs.readFileSync(filePath, 'utf-8')) } catch (e) { logger.error('[BILI PLUGIN] 读取 ' + filePath + ' 失败', e); return null }
}

function saveYAML(filePath, data) {
  try { fs.writeFileSync(filePath, YAML.stringify(data)); return true } catch (e) { logger.error('[BILI PLUGIN] 写入 ' + filePath + ' 失败', e); return false }
}

function setNested(obj, fieldPath, value) {
  const keys = fieldPath.split('.')
  let cur = obj
  for (let i = 0; i < keys.length - 1; i++) { if (typeof cur[keys[i]] !== 'object' || cur[keys[i]] === null) cur[keys[i]] = {}; cur = cur[keys[i]] }
  cur[keys[keys.length - 1]] = value
}

function getNested(obj, fieldPath) {
  return fieldPath.split('.').reduce(function (o, k) { return o == null ? undefined : o[k] }, obj)
}

export function loadRawConfig() { return loadYAML(CONFIG_FILE) || {} }
export function saveRawConfig(cfg) { return saveYAML(CONFIG_FILE, cfg) }

export function loadConfig() {
  const raw = loadRawConfig()
  const cfg = { bili: raw.bili || { ck: '', accounts: [] } }
  for (const fieldPath of Object.keys(FIELD_MAP)) {
    const oldKey = FIELD_MAP[fieldPath]
    const nestedVal = getNested(raw, fieldPath)
    const oldVal = raw[oldKey]
    const val = nestedVal !== undefined ? nestedVal : (oldVal !== undefined ? oldVal : DEFAULTS[fieldPath])
    setNested(cfg, fieldPath, val)
  }
  return cfg
}

export function saveConfig(cfg) {
  const raw = loadRawConfig()
  for (const fieldPath of Object.keys(FIELD_MAP)) {
    const oldKey = FIELD_MAP[fieldPath]
    const val = getNested(cfg, fieldPath)
    if (val === undefined) continue
    setNested(raw, fieldPath, val)
    raw[oldKey] = val
  }
  if (cfg.bili) raw.bili = cfg.bili
  return saveRawConfig(raw)
}

export function getCfg(fieldPath) {
  const raw = loadRawConfig()
  const oldKey = FIELD_MAP[fieldPath]
  const nestedVal = getNested(raw, fieldPath)
  if (nestedVal !== undefined) return nestedVal
  if (oldKey && raw[oldKey] !== undefined) return raw[oldKey]
  return DEFAULTS[fieldPath]
}

export function setCfg(fieldPath, value) {
  const raw = loadRawConfig()
  setNested(raw, fieldPath, value)
  const oldKey = FIELD_MAP[fieldPath]
  if (oldKey) raw[oldKey] = value
  return saveRawConfig(raw)
}

export function getLegacy(key) { const raw = loadRawConfig(); return raw ? raw[key] : undefined }

/* ---------------- B站账号 CK 管理（登录的 ck 即为解析所用的 ck） ---------------- */

function sanitizeId(id) { return String(id).replace(/:/g, '_').trim() }
function cookieFilePath(userId) { return path.join(COOKIE_DIR, sanitizeId(userId) + '.json') }

export function readUserCookies(userId) {
  const file = cookieFilePath(userId)
  if (!fs.existsSync(file)) return null
  try { return JSON.parse(fs.readFileSync(file, 'utf-8')) } catch (e) { return null }
}

export function writeUserCookies(userId, cookies) {
  const file = cookieFilePath(userId)
  if (!fs.existsSync(path.dirname(file))) fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, JSON.stringify(cookies, null, 2))
}

export function syncAccountToConfig(qq, cookies) {
  const raw = loadRawConfig()
  if (!raw.bili) raw.bili = { ck: '', accounts: [] }
  if (!Array.isArray(raw.bili.accounts)) raw.bili.accounts = []
  raw.bili.accounts = raw.bili.accounts.filter(function (a) { return String(a.qq) !== String(qq) })
  for (const uid of Object.keys(cookies)) {
    const ck = cookies[uid] || {}
    raw.bili.accounts.push({ qq: String(qq), uid: String(uid), SESSDATA: ck.SESSDATA || '', expires: ck.expires_in || 0, time: new Date().toLocaleString('zh-CN', { hour12: false }) })
  }
  saveRawConfig(raw)
}

export function listAllAccounts() {
  const accounts = []
  if (!fs.existsSync(COOKIE_DIR)) return accounts
  const files = fs.readdirSync(COOKIE_DIR)
  for (const file of files) {
    if (!file.endsWith('.json')) continue
    const qq = file.replace('.json', '')
    const cookies = readUserCookies(qq)
    if (!cookies) continue
    for (const uid of Object.keys(cookies)) {
      const ck = cookies[uid] || {}
      accounts.push({ qq: qq, uid: String(uid), SESSDATA: ck.SESSDATA || '', expires: ck.expires_in || 0 })
    }
  }
  return accounts
}

export function removeAccount(qq, uid) {
  const file = cookieFilePath(qq)
  if (fs.existsSync(file)) {
    const cookies = readUserCookies(qq) || {}
    delete cookies[String(uid)]
    if (Object.keys(cookies).length === 0) fs.unlinkSync(file)
    else writeUserCookies(qq, cookies)
  }
  const raw = loadRawConfig()
  if (raw.bili && raw.bili.accounts) {
    raw.bili.accounts = raw.bili.accounts.filter(function (a) { return !(String(a.qq) === String(qq) && String(a.uid) === String(uid)) })
    saveRawConfig(raw)
  }
}

export function getParseCk(userId) {
  if (userId) {
    const cookies = readUserCookies(userId)
    if (cookies) {
      const uids = Object.keys(cookies)
      if (uids.length > 0) { const ck = (cookies[uids[0]] || {}).SESSDATA; if (ck) return ck }
    }
  }
  const raw = loadRawConfig()
  return (raw.bili && raw.bili.ck) || raw.SESSDATA || ''
}
