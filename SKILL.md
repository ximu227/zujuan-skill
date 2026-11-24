---
name: zujuan
description: 操作组卷网（zujuan.xkw.com）完成选题、筛选试题、试题篮、组卷、智能组卷、细目表组卷、试卷汇编、下载 Word/PDF 试卷、存档与收藏等。当用户提到组卷网、学科网组卷、出卷、组一份试卷、选题、找某地区/某类型的题、下载试卷时使用。全部在云主机（云电脑）运行，通过 node scripts/zj.mjs 调用，经 CDP 连接平台浏览器，不依赖用户本地电脑。
---

# 组卷网技能（云端版）

在云主机上通过平台常驻浏览器操作组卷网。所有操作都用一个命令行脚本完成：

```
node <本技能目录>/scripts/zj.mjs <子命令> ...
```

下文用 `zj` 代指 `node <本技能目录>/scripts/zj.mjs`。脚本第一次运行时会自动在云主机本地启动网关（http://127.0.0.1:8765），网关通过 CDP（`ZUJUAN_CDP_ENDPOINT`，默认平台浏览器 9222 端口）连接浏览器，之后的调用都很快。

## 环境自检与自愈（自动，无需手动部署）

每次运行任何 `zj` 命令前，脚本会先检查运行环境（安装目录由环境变量 `ZUJUAN_HOME` 指定，默认 `$HOME/zujuan-mcp`，自动适配当前登录用户，无需手动改路径）：

- **环境正常**：项目关键文件（`doubao/gateway.mjs`、`package.json`、`src/index.js`）和依赖（`node_modules` 下的 `@modelcontextprotocol/sdk`、`playwright`）都在 → **静默跳过，不做任何操作**，直接执行原命令。
- **环境异常**：按下表自动从 GitHub 拉取恢复，复检通过后再继续；仓库已公开，克隆无需认证。

| 检测到的问题 | 自动处理 |
|---|---|
| 安装目录不存在 | `git clone` 仓库，再 `npm install` |
| 目录是 git 仓库但关键文件损坏/缺失 | `git fetch` + `git reset --hard origin/<分支>` 修复 |
| 目录存在但非 git 仓库且内容不完整 | 先备份为 `目录.bak-时间戳`，再重新克隆（不删用户数据） |
| 代码完整但依赖缺失 | 仅执行 `npm install --omit=dev` |

因此云主机重建后，第一次运行 `zj` 即会自动完成部署，不需要手动执行 `deploy.sh`。仓库地址、分支在 `config.json` 的 `repo`/`branch` 配置，也可用环境变量 `ZUJUAN_REPO`/`ZUJUAN_BRANCH` 覆盖。若自愈后复检仍失败（通常是网络问题），脚本会报错退出，再按故障排查处理。

## 子命令

| 命令 | 作用 |
|---|---|
| `zj status` | 登录状态、当前学科、试题篮数量。**每次任务先运行它** |
| `zj tools [关键字...]` | 查找工具，如 `zj tools 下载`、`zj tools 筛选 地区` |
| `zj schema <工具名>` | 查看工具的完整说明和参数 |
| `zj call <工具名> [参数]` | 执行工具 |
| `zj start` / `zj stop` | 手动启动 / 停止网关 |

### 参数写法（`zj call`）

- 简单参数用 `key=value`，值按 JSON 解析：`page=2`、`withImages=true`、`ids=[123,456]`。数组也可以写成 `"ids=123,456"`。
- 字符串参数原样保留：`subject=初中数学`、`title=期中测试`。
- **含空格、逗号、方括号的参数要整个加引号**：`"ids=123,456"`。
- 参数复杂（对象、对象数组，如 `filters`、`scores`、`items`）时，**先把 JSON 写进一个文件，再用 `@文件路径`**：`zj call zujuan_list_papers @/tmp/args.json`。不要在命令行里直接写带引号的 JSON。
- 不确定参数时先 `zj schema <工具名>`，不要猜。

### 输出

- 输出为文本/JSON。工具出错时以「错误：」开头，退出码为 1，请阅读错误信息再决定下一步。
- 截图类工具（如 `zujuan_screenshot_question`）把图片保存为 PNG，并打印 `[图片已保存] 路径`，需要时用 Read 打开查看。
- 下载的试卷保存在云主机 `ZUJUAN_DOWNLOAD_DIR`（默认 `$HOME/zujuan-downloads`），结果里给出完整文件路径。

## 必须遵守

1. **登录**：`zj status` 显示未登录时，先 `zj call browser_navigate url=/login`，等待 5 秒后 `zj call browser_screenshot`，用 Read 查看并裁剪放大二维码，通过 RichMediaCard 发给用户，**请用户用微信或学科网 APP 扫码**；扫码后重新 `zj status` 确认 `loggedIn=true`。不要向用户索要密码。
2. **滑块验证（极验 GeeTest）**：站点有风控，下载等操作可能弹出滑块。**不要自动破解验证码，也不要反复重试同一个命令**。按下面的实测流程请用户人工完成：
   - 先用 `computer_use_tool`（`plane="bu"`）执行 `bu.navigate("https://zujuan.xkw.com/")` 建立浏览器自动化会话（这是发起接管的前置条件；bu 与网关连接的是同一个平台浏览器，登录态共享）。
   - 把下载命令在后台运行并设较长 `timeoutSec`（如 600），然后调用 `interaction.request_action`（`type="browserControl"`），请用户接管云电脑，切换到「组卷中心」标签页，按住滑块拖到缺口完成拼图后交回。
   - 用户完成后下载工具会自动检测并保存；用后台任务的返回确认 `saved` 路径。
   - 若用户跳过/取消接管，不要绕过，报告该步骤需要人工处理。
3. **按学科分开**：试题篮、组卷中心、试卷篮都按学科分开。相关工具都传 `subject`（代码如 `czsx`，或名称如 `初中数学`），可用 `zj call zujuan_list_subjects` 查代码。
4. **一次只做一件事**：调用会排队串行执行，不要并行发起多个命令。
5. **耗时**：翻页收集、下载等可能要 1–5 分钟，执行命令时把超时设长一些（建议 ≥ 10 分钟），不要中途打断。
6. **合理频率**：遵守组卷网用户协议，不要批量抓取题库。

## 云端文件交付（重要）

- 下载的试卷、答题卡等文件位于云主机目录，用户本地看不到。**必须先 `FileBatchUpload` 上传这些文件，再用 `present_files` 把返回的链接交付给用户**。
- 截图类图片通过 RichMediaCard 交付（引用云主机绝对路径，带 env_id）。
- 不要把云主机本地路径直接当作用户可打开的路径写在回复里。

## 重要概念

- **试题篮**放单道题；「去组卷」（`zujuan_basket_to_paper`）把试题篮中**已勾选**的题送入**组卷中心**生成试卷。
- **试卷篮**放整套试卷（最多 30 套），用于「试卷汇编」。
- 题目地区筛选只到「省」；要按城市/学校筛选，用 `zujuan_collect_questions` 的 `sourceKeywords`（按试题来源关键字过滤）。整套试卷列表（`zujuan_list_papers`）支持「城市」筛选。
- 组卷网的公式、答案解析多为图片：看题干用 `zujuan_screenshot_question`，看答案用它的 `part=answer`。
- 设置试卷标题要在切换模板（`zujuan_paper_set_template`）**之后**。

## 常用流程

### 按知识点选题并组卷下载

```
zj status
zj call zujuan_open_subject subject=初中数学 mode=zhishidian
zj call zujuan_get_catalog filter=作图                  # 找到节点 URL，如 /czsx/zsd188409/
zj call zujuan_list_questions url=/czsx/zsd188409/
zj call zujuan_get_filters                              # 看有哪些筛选项
zj call zujuan_apply_filter group=地区 option=吉林
zj call zujuan_apply_filter group=年级 option=九年级
zj call zujuan_collect_questions @/tmp/args.json        # {"sourceKeywords":["长春"],"maxPages":30}
                                                        # 返回 nextPage 时，带 url + startPage 再调一次
zj call zujuan_add_to_basket "ids=123,456,789"
zj call zujuan_basket_to_paper subject=czsx             # 组卷中心已有草稿会报错，确认后加 overwrite=true
zj call zujuan_paper_set_template template=测试
zj call zujuan_paper_set_title title=长春九年级网格作图题精选
zj call zujuan_paper_structure subject=czsx             # 查看试题 id 和分值
zj call zujuan_paper_set_scores @/tmp/scores.json       # {"scores":{"123":5,"456":5}}
zj call zujuan_download_paper subject=czsx answerPosition=卷尾
```

### 试卷汇编

```
zj call zujuan_list_papers @/tmp/args.json      # {"subject":"gzsx","section":"jdcs","filters":[{"group":"年份","option":"2026"},{"group":"地区","option":"吉林"},{"group":"年级学期","option":"高二上学期"}]}
zj call zujuan_paper_basket_add @/tmp/args.json # {"subject":"gzsx","paperIds":[...]}
zj call zujuan_paper_basket_tree subject=gzsx
zj call zujuan_open_compilation subject=gzsx knowledgeId=<上一步的 id>
zj call zujuan_apply_filter group=题型 option=单选题
...之后同上：加入试题篮 → 去组卷 → 设置 → 下载
```

### 智能组卷 / 细目表组卷

先 `zj schema zujuan_smart_paper` 或 `zj schema zujuan_spec_table_paper` 看参数，把参数写进 JSON 文件再 `@文件` 调用。

### 下载整套原卷

```
zj call zujuan_download_paper source=paper paperId=<试卷 id> bankId=<学科 bankId>
```

## 工具清单

全部工具及一句话说明见 [references/tools.md](references/tools.md)（也可随时 `zj tools` 查看）。专用工具覆盖不了的页面操作，可用 `browser_*` 系列通用浏览器工具（`browser_snapshot` 看页面结构，`browser_click` 点击等）。

## 故障排查

- `网关启动失败`：查看日志 `~/.zujuan-mcp/gateway.log`。正常情况下环境自检会自动 clone/安装缺失的项目与依赖；若自检已报错，先排查网络（能否访问 github.com），再手动兜底：`curl -fsSL https://raw.githubusercontent.com/ximu227/zujuan-mcp/main/deploy.sh | bash`。其他原因：端口被占用（设置 `ZUJUAN_GATEWAY_PORT`）。
- `无法连接平台浏览器 / CDP 端点不可用`：确认平台浏览器在运行且 9222 端口可访问（`curl http://127.0.0.1:9222/json/version`）；恢复后重新执行命令。
- 下载报 `saveAs ... ENOENT`：平台浏览器默认把文件下载到 `~/Downloads`，而非 Playwright 临时目录。共享模式下 `attachPage` 已通过页面级 `Page.setDownloadBehavior` 把下载重定向到 `ZUJUAN_DOWNLOAD_DIR`，并由 `saveDownload` 等待文件落盘；若仍异常，检查 `~/Downloads` 是否有该文件，以及目标目录是否存在、可写。
- 浏览器卡住/状态异常：`zj stop` 后重新执行命令（会自动重启网关并重新连接）。
