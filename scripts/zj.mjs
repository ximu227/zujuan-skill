#!/usr/bin/env node
// 组卷网命令行（云端版，豆包技能调用的脚本）。无第三方依赖，只需要 Node 18+。
//
//   node zj.mjs status                     网关与组卷网状态（网关没启动会自动启动）
//   node zj.mjs tools [关键字...]           列出/查找工具
//   node zj.mjs schema <工具名>             查看工具参数
//   node zj.mjs call <工具名> [参数]        执行工具，参数三种写法任选：
//        key=value key2=value2             值会按 JSON 解析（ids=[1,2]、page=2、withImages=true）
//        '{"subject":"czsx"}'              一整段 JSON
//        @args.json                        从文件读取 JSON（复杂参数推荐）
//   node zj.mjs start | stop               手动启动 / 停止网关
//
// 工具返回的图片（截图）会保存为 PNG 文件并打印路径。
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(path.join(HERE, 'config.json'), 'utf8'));
  } catch {
    return {};
  }
}
const CONFIG = readConfig();

/** 找到 zujuan-mcp 项目目录：环境变量 → config.json → 从脚本位置向上查找 */
function findHome() {
  const has = (d) => d && fs.existsSync(path.join(d, 'doubao', 'gateway.mjs'));
  const candidates = [process.env.ZUJUAN_HOME, CONFIG.home];
  for (let d = HERE, i = 0; i < 8; i++, d = path.dirname(d)) candidates.push(d);
  const hit = candidates.find(has);
  if (!hit) fail('找不到 zujuan-mcp 项目目录。请设置环境变量 ZUJUAN_HOME 指向项目目录（包含 doubao/gateway.mjs），或在本脚本旁的 config.json 中写 {"home": "项目目录"}。');
  return hit;
}

const PORT = Number(process.env.ZUJUAN_GATEWAY_PORT || CONFIG.port || 8765);
const TOKEN = process.env.ZUJUAN_GATEWAY_TOKEN || CONFIG.token || '';
const DISPLAY = String(CONFIG.display || process.env.DISPLAY || ':99');

// ───────────────────────── 环境自检与 GitHub 自愈 ─────────────────────────

const REPO_URL = process.env.ZUJUAN_REPO || CONFIG.repo || 'https://github.com/ximu227/zujuan-mcp.git';
const BRANCH = process.env.ZUJUAN_BRANCH || CONFIG.branch || 'main';

/** 目标安装目录（不要求已存在）：环境变量 → config.home → 默认 $HOME/zujuan-mcp */
function targetHome() {
  return process.env.ZUJUAN_HOME || CONFIG.home || path.join(os.homedir(), 'zujuan-mcp');
}

/** 执行命令，返回 { code, stdout, stderr }；命令缺失等错误也正常返回而非抛出 */
function run(cmd, args, opts = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      cwd: opts.cwd,
      shell: process.platform === 'win32',
      env: { ...process.env, ...(opts.env || {}) },
    });
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { err += d; });
    child.on('error', (e) => resolve({ code: 1, stdout: out, stderr: err + e.message }));
    child.on('close', (code) => resolve({ code, stdout: out, stderr: err }));
  });
}

/** 检查项目关键文件与依赖是否完整 */
function environmentOK(home) {
  const exists = (rel) => fs.existsSync(path.join(home, rel));
  const homeOk = exists('doubao/gateway.mjs') && exists('package.json') && exists('src/index.js');
  const depsOk =
    exists('node_modules/@modelcontextprotocol/sdk/package.json') &&
    exists('node_modules/playwright/package.json');
  return { homeOk, depsOk };
}

/** 让代码目录就位：修复已有 git 仓库 / 备份后重建非 git 目录 / 全新克隆 */
async function restoreHome(home) {
  if (fs.existsSync(path.join(home, '.git'))) {
    console.log('==> 项目目录异常，从 GitHub 重置到最新代码');
    await run('git', ['fetch', '--depth=1', 'origin', BRANCH], { cwd: home });
    const r = await run('git', ['reset', '--hard', `origin/${BRANCH}`], { cwd: home });
    if (r.code) fail(`git 重置失败：${r.stderr.trim() || r.stdout.trim()}`);
    return;
  }
  if (fs.existsSync(home)) {
    // 目录存在但不是 git 仓库且关键文件缺失：先备份再重新克隆，避免误删用户数据
    const backup = `${home}.bak-${Date.now()}`;
    console.log(`==> 目录存在但内容不完整，备份到 ${backup} 后重新克隆`);
    fs.renameSync(home, backup);
  } else {
    fs.mkdirSync(path.dirname(home), { recursive: true });
    console.log('==> 项目不存在，从 GitHub 克隆');
  }
  const r = await run('git', ['clone', '--depth=1', '--branch', BRANCH, REPO_URL, home]);
  if (r.code) fail(`git clone 失败：${r.stderr.trim() || r.stdout.trim()}`);
}

/** 安装运行依赖 */
async function restoreDeps(home) {
  console.log('==> 依赖缺失，执行 npm install');
  const r = await run('npm', ['install', '--omit=dev', '--no-audit', '--no-fund'], { cwd: home });
  if (r.code) fail(`npm install 失败：${r.stderr.trim() || r.stdout.trim()}`);
}

/** 环境自检：正常则静默跳过；异常则自动从 GitHub 拉取恢复，复检通过后返回安装目录 */
async function ensureEnvironment() {
  const home = targetHome();
  let { homeOk, depsOk } = environmentOK(home);
  if (homeOk && depsOk) return home;
  if (!homeOk) await restoreHome(home);
  if (!environmentOK(home).depsOk) await restoreDeps(home);
  const check = environmentOK(home);
  if (!check.homeOk || !check.depsOk) fail('环境自愈后复检仍不完整，请检查网络连接或手动部署。');
  console.log('==> 环境已恢复');
  return home;
}

function fail(msg, code = 1) {
  process.stderr.write(msg + '\n');
  process.exit(code);
}

function request(method, p, body) {
  return new Promise((resolve, reject) => {
    const data = body === undefined ? undefined : Buffer.from(JSON.stringify(body));
    const req = http.request(
      {
        host: '127.0.0.1',
        port: PORT,
        path: p,
        method,
        headers: {
          ...(data ? { 'Content-Type': 'application/json', 'Content-Length': data.length } : {}),
          ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
        },
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const s = Buffer.concat(chunks).toString('utf8');
          let json;
          try {
            json = JSON.parse(s);
          } catch {
            json = { error: s };
          }
          if (res.statusCode >= 400) reject(new Error(json.error || `HTTP ${res.statusCode}`));
          else resolve(json);
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function health() {
  try {
    return await request('GET', '/health');
  } catch {
    return null;
  }
}

/**
 * 云主机无物理显示器：autoXvfb 时确保 Xvfb 虚拟显示在运行，
 * 登录/滑块验证切换为有头模式时浏览器才有地方显示。
 */
async function ensureXvfb() {
  if (!CONFIG.autoXvfb) return;
  const num = DISPLAY.startsWith(':') ? DISPLAY.slice(1) : DISPLAY;
  const socket = path.join('/tmp/.X11-unix', `X${num}`);
  if (fs.existsSync(socket)) return;
  const proc = spawn('Xvfb', [DISPLAY, '-screen', '0', '1400x950x24', '-nolisten', 'tcp'], {
    detached: true,
    stdio: 'ignore',
  });
  proc.unref();
  for (let i = 0; i < 40; i++) {
    await sleep(250);
    if (fs.existsSync(socket)) return;
  }
  fail('Xvfb 虚拟显示启动失败，请检查系统是否安装 Xvfb。');
}

async function ensureGateway() {
  if (await health()) return;
  await ensureXvfb();
  const home = targetHome();
  const logDir = path.join(os.homedir(), '.zujuan-mcp');
  fs.mkdirSync(logDir, { recursive: true });
  const logFile = path.join(logDir, 'gateway.log');
  const fd = fs.openSync(logFile, 'a');
  const child = spawn(process.execPath, [path.join(home, 'doubao', 'gateway.mjs')], {
    cwd: home,
    detached: true,
    windowsHide: true,
    stdio: ['ignore', fd, fd],
    // config.json 中的 env 注入网关进程，网关再透传给浏览器管理子进程
    env: {
      ...process.env,
      // 下载目录默认基于当前用户 home 动态解析，避免写死本机路径；config/环境变量可覆盖
      ZUJUAN_DOWNLOAD_DIR: path.join(os.homedir(), 'zujuan-downloads'),
      ...(CONFIG.env || {}),
      DISPLAY,
      ZUJUAN_GATEWAY_PORT: String(PORT),
      ...(TOKEN ? { ZUJUAN_GATEWAY_TOKEN: TOKEN } : {}),
    },
  });
  child.unref();
  for (let i = 0; i < 40; i++) {
    await sleep(500);
    if (await health()) return;
  }
  fail(`网关启动失败，请查看日志：${logFile}`);
}

async function getTools() {
  return (await request('GET', '/api/tools')).tools;
}

/** 把 key=value 参数按工具参数类型转换：字符串参数保留原文，其他按 JSON 解析 */
function parseArgs(rest, schema) {
  if (!rest.length) return {};
  if (rest.length === 1 && rest[0].startsWith('@')) return JSON.parse(fs.readFileSync(rest[0].slice(1), 'utf8').replace(/^\uFEFF/, ''));
  if (rest.length === 1 && /^\s*\{/.test(rest[0])) return JSON.parse(rest[0]);
  const props = schema?.properties || {};
  const out = {};
  for (const kv of rest) {
    const i = kv.indexOf('=');
    if (i < 1) fail(`参数格式错误：${kv}（应为 key=value，或一整段 JSON，或 @文件.json）`);
    const key = kv.slice(0, i);
    const raw = kv.slice(i + 1);
    const type = props[key]?.type;
    if (type === 'string') out[key] = raw;
    // 数组参数允许逗号分隔：ids=1,2,3
    else if (type === 'array' && !raw.trim().startsWith('[')) out[key] = raw.split(/[,，]/).map((s) => s.trim()).filter(Boolean);
    else {
      try {
        out[key] = JSON.parse(raw);
      } catch {
        out[key] = raw;
      }
    }
  }
  return out;
}

function printResult(name, result) {
  const shotDir = path.join(
    process.env.ZUJUAN_DOWNLOAD_DIR || CONFIG.env?.ZUJUAN_DOWNLOAD_DIR || path.join(os.homedir(), 'zujuan-downloads'),
    'screenshots'
  );
  let n = 0;
  for (const c of result.content || []) {
    if (c.type === 'text') process.stdout.write(c.text + '\n');
    else if (c.type === 'image') {
      fs.mkdirSync(shotDir, { recursive: true });
      const file = path.join(shotDir, `${name}-${Date.now()}-${n++}.png`);
      fs.writeFileSync(file, Buffer.from(c.data, 'base64'));
      process.stdout.write(`[图片已保存] ${file}\n`);
    } else process.stdout.write(JSON.stringify(c) + '\n');
  }
  if (result.isError) process.exitCode = 1;
}

const firstLine = (s = '') => s.split(/[。\n]/)[0];

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  // 运行任何实际命令前先做环境自检：正常则跳过，异常则自动从 GitHub 恢复
  if (cmd) await ensureEnvironment();
  switch (cmd) {
    case 'start': {
      await ensureGateway();
      return console.log(JSON.stringify(await health()));
    }
    case 'stop': {
      if (!(await health())) return console.log('网关没有在运行');
      await request('POST', '/api/shutdown', {});
      return console.log('网关已停止');
    }
    case 'status': {
      await ensureGateway();
      return printResult('status', await request('POST', '/api/call', { name: 'zujuan_status', arguments: {} }));
    }
    case 'tools': {
      await ensureGateway();
      const words = rest.map((w) => w.toLowerCase());
      const list = (await getTools()).filter((t) => !words.length || words.some((w) => `${t.name} ${t.description}`.toLowerCase().includes(w)));
      return console.log(list.map((t) => `${t.name} — ${firstLine(t.description)}`).join('\n') || '没有匹配的工具');
    }
    case 'schema': {
      if (!rest[0]) fail('用法：node zj.mjs schema <工具名>');
      await ensureGateway();
      const t = (await getTools()).find((x) => x.name === rest[0]);
      if (!t) fail(`没有名为 ${rest[0]} 的工具，用 node zj.mjs tools <关键字> 查找`);
      return console.log(JSON.stringify(t, null, 2));
    }
    case 'call': {
      const [name, ...args] = rest;
      if (!name) fail('用法：node zj.mjs call <工具名> [key=value ...]');
      await ensureGateway();
      const t = (await getTools()).find((x) => x.name === name);
      if (!t) fail(`没有名为 ${name} 的工具，用 node zj.mjs tools <关键字> 查找`);
      let parsed;
      try {
        parsed = parseArgs(args, t.inputSchema);
      } catch (e) {
        fail(`参数解析失败：${e.message}`);
      }
      return printResult(name, await request('POST', '/api/call', { name, arguments: parsed }));
    }
    default:
      console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\nimport ')[0].replace(/^#!.*\n/, '').replace(/^\/\/ ?/gm, ''));
  }
}

main().catch((e) => fail(`错误：${e?.message || e}`));
