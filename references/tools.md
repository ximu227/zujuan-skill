# 组卷网工具清单

共 80 个工具。调用：`zj call <工具名> [参数]`；查看参数：`zj schema <工具名>`。

| 工具 | 说明 | 参数 |
|---|---|---|
| `zujuan_status` | 查看浏览器当前页面、是否已登录组卷网、试题篮数量等状态。 | — |
| `zujuan_login` | 登录组卷网。会打开一个可见的浏览器窗口，用户可扫码或输入账号密码登录；登录态保存在本地浏览器用户目录，后续无需重复登录。加入试题篮、全站搜索、查看答案解析、下载试卷等都需要登录。 | timeoutSec, username, password |
| `zujuan_logout` | 退出组卷网登录。 | — |
| `zujuan_list_subjects` | 列出组卷网全部学段学科及代码（如 gzsx=高中数学、czwl=初中物理）。 | — |
| `zujuan_open_subject` | 切换学科并打开该学科的章节选题或知识点选题页面。打开后可用 zujuan_get_catalog 查看目录、zujuan_list_questions 读取题目。 | **subject**, mode |
| `zujuan_list_textbooks` | 在章节选题页列出可选的教材版本（人教版、北师大版等）和该版本下的教材册次；传入 version 可切换版本。切换册次请把返回的 textbooks[].url 传给 zujuan_list_questions 或 zujuan_get_catalog。 | version |
| `zujuan_get_catalog` | 读取当前页（或指定 URL）左侧的章节目录树/知识点树，返回每个节点的名称和 URL。节点 URL 可传给 zujuan_list_questions 查看该章节/知识点下的题目。 | url, maxDepth, filter |
| `zujuan_list_questions` | 读取题目列表（每页 10 题）：题号 id、题型、难度、知识点、来源、题干文本、是否已在试题篮。可传入章节/知识点 URL，或翻页。 | url, page, withImages |
| `zujuan_collect_questions` | 在当前（或指定）题目列表上自动翻页，按「来源/题干/知识点」关键字收集试题。用于站点筛选不支持的条件，例如只要长春市（或某所学校）的题：地区筛选只到省，先用 zujuan_apply_filter 选「吉林」，再用 sourceKeywords:["长春"]。 | url, startPage, sourceKeywords, contentKeywords, knowledgeKeywords, includeCitations, maxPages, limit |
| `zujuan_get_filters` | 列出当前题目列表页可用的筛选条件（场景、题型、难度、分类、年份、地区、年级、学期、排序等）及当前选中项。 | — |
| `zujuan_apply_filter` | 在当前题目列表页应用一个筛选条件，返回筛选后的第一页题目。可多次调用叠加不同分组的筛选。 | **group**, **option**, withImages |
| `zujuan_search_in_results` | 在当前章节/知识点题目列表中按关键字搜索（"在结果中搜索"）。 | **keyword**, withImages |
| `zujuan_search` | 使用组卷网顶部搜索框进行全站试题搜索（需要登录）。 | **keyword**, withImages |
| `zujuan_get_question` | 打开试题详情页，返回题干、题型难度、知识点、来源、是否在试题篮。答案解析是图片，请用 zujuan_screenshot_question 的 part="answer" 查看。 | **id**, bankId, withImages |
| `zujuan_screenshot_question` | 截取某道题的图片（组卷网的公式多以图片呈现，截图可让模型准确看到题目）。part="answer" 时截取答案与解析（组卷网的答案解析只以图片形式提供，需登录）。 | **id**, part |
| `zujuan_add_to_basket` | 把试题加入试题篮（需要登录）。题目在当前列表页上则直接点击，否则打开详情页后加入。 | **ids** |
| `zujuan_remove_from_basket` | 把试题从试题篮移除（需要登录）。 | **ids** |
| `zujuan_get_basket` | 查看试题篮：题目总数、平均难度、按题型分组的题目 id/难度/来源。试题篮按学科分开。 | subject |
| `zujuan_clear_basket` | 清空某学科的试题篮。 | subject |
| `zujuan_basket_to_paper` | 试题篮「去组卷」：把试题篮中的试题送入组卷中心生成试卷。不传 ids 则送入试题篮全部试题；传 ids 则只送这些题（完成后恢复试题篮原勾选状态）。之后可用 zujuan_get_paper 查看试卷。 | overwrite, ids, subject |
| `zujuan_get_paper` | 读取组卷中心当前试卷：题量、难度、试题 id 列表、题型结构。组卷中心按学科分开。 | subject |
| `zujuan_clear_paper` | 清空组卷中心当前试卷中的全部试题（试题仍保留在试题篮中，可在【我的-选题记录】找回近 15 天记录）。 | subject |
| `zujuan_download_paper` | 下载试卷（Word/PDF）到本地。source=center 下载组卷中心当前试卷（默认）；source=paper 下载整套原卷（需 paperId）；source=topic 整卷下载专辑/专题（需 url）。可设置标题、答案位置、解析内容、纸张、格式、公式格式等。站点可能弹出滑块验证码：此时会弹出可见浏览器窗口，需要用户手动拖动滑块，工具等待验证通过后保存文件。默认不从试题篮删除本次用题。 | title, answerPosition, includeAnalysis, includeKnowledge, includeDifficulty, includeQrCode, source, removeFromBasket, paperSize, format, formula, answerArea, fontSize, useScene, timeoutSec, subject, paperId, bankId, url |
| `zujuan_open_paper_editor` | 打开组卷中心（试卷编辑/预览页），可在此调整试卷、下载试卷。打开后可用 browser_snapshot 查看页面，再用 browser_click 操作。 | — |
| `zujuan_list_papers` | 试卷选题：浏览整套试卷列表（同步教学 tbjx / 阶段测试 jdcs：月考期中期末专题开学考 / 备考 bk：高考中考模拟、真题、学业考试、一二三轮复习）。返回试卷 id、名称、年级、年份、地区、题量、是否在试卷篮。可叠加筛选、翻页。 | subject, section, url, filters, page |
| `zujuan_get_paper_filters` | 列出当前试卷列表页可用的筛选项（类别/章节、年级学期、年份、试卷等级、难度、地区、城市、排序等），当前选中项用 [ ] 标出。选中省份后会出现「城市」分组。 | — |
| `zujuan_search_schools` | 按名称搜索学校（试卷列表可按学校筛选，选中后用 zujuan_list_papers 的 url 参数加 ?schoolId= 打开）。 | **keyword** |
| `zujuan_get_paper_detail` | 打开整套试卷详情：标题、地区/年级/类型、各大题下的试题（id、题型、难度、题干）、试卷分析（整体难度、考查范围）。 | **paperId**, bankId |
| `zujuan_add_paper_questions_to_basket` | 把整套试卷的全部试题一次性加入试题篮（相当于逐题点「加入试题篮」）。 | **paperId**, bankId |
| `zujuan_favorite_paper` | 收藏 / 取消收藏整套试卷（收藏的试卷进入个人题库）。 | **paperId**, bankId, **name**, **questionCount**, favorite |
| `zujuan_paper_basket_add` | 试卷汇编第 1 步：把整套试卷加入「试卷篮」（最多 30 套）。之后用 zujuan_paper_basket_tree 查看汇总后的知识点目录，用 zujuan_open_compilation 打开汇编结果。 | **paperIds**, bankId, subject |
| `zujuan_paper_basket_remove` | 从试卷篮移出试卷。 | **paperIds**, bankId, subject |
| `zujuan_paper_basket_clear` | 清空某学科的试卷篮（只影响该学科）。 | bankId, subject |
| `zujuan_paper_basket_tree` | 试卷汇编：试卷篮中所有试卷的试题按知识点汇总后的目录树（每个节点含题数和知识点 id）。可用 filter 按关键字查找知识点。 | subject, filter |
| `zujuan_open_compilation` | 打开「试卷汇编」页面：把试卷篮中各试卷的试题按知识点汇总展示。可指定知识点 id（来自 zujuan_paper_basket_tree）只看该知识点；之后可用 zujuan_apply_filter（题型/难度/年份/地区等）、zujuan_list_questions 翻页、zujuan_add_to_basket 选题。 | subject, knowledgeId |
| `zujuan_smart_paper` | 智能组卷：选择章节或知识点范围，设定各题型数量，自动生成一套试卷并返回预览中的试题。节点 id 来自 zujuan_get_catalog（章节 URL 中 zj 后的数字，或知识点 zsd 后的数字）。生成后可用 zujuan_smart_paper_add_all 全部加入试题篮。 | subject, **nodeIds**, treeType, **quesTypes**, scene, areaId, years, difficulty |
| `zujuan_smart_paper_add_all` | 把智能组卷预览中的全部试题加入试题篮。 | — |
| `zujuan_smart_paper_switch` | 智能组卷预览页「智能换题」：把某道题换成同知识点、同题型、同难度的另一道题。 | **id** |
| `zujuan_spec_table_paper` | 细目表组卷：逐题指定题型、考查知识点（或教材章节）、难度、分值，由站点一键选题，返回每题选中的试题 id；addToBasket=true 时直接加入试题篮。知识点 id 来自 zujuan_get_catalog（zsd 后的数字），章节 id 为 zj 后的数字。 | subject, title, by, priority, provinceId, addToBasket, **items** |
| `zujuan_paper_structure` | 读取组卷中心试卷的完整结构：标题、模板、题量、总分、各卷/题型下的试题 id、分值、难度、来源。 | subject |
| `zujuan_paper_set_title` | 修改组卷中心试卷的主标题 / 副标题。 | title, subtitle |
| `zujuan_paper_set_template` | 设置试卷模板：作业 / 测试 / 考试（改变卷头：默认标题、分卷、注意事项等）。注意：切换模板会把标题重置为该模板的默认标题，请在切换模板之后再调用 zujuan_paper_set_title；自定义标题后站点界面会把模板显示为「作业」，但卷头设置不受影响。 | **template** |
| `zujuan_paper_set_order` | 设置试卷分组与排序：按题型 / 按知识点 / 按加入顺序；easyToHard=true 时组内由易到难。 | groupBy, easyToHard |
| `zujuan_paper_set_scores` | 设置试题分值。传 {试题id: 分值}，如 {"36445148": 5, "29677732": 6}。 | **scores** |
| `zujuan_paper_question_action` | 组卷中心内对单题操作：up=上移，down=下移，delete=从试卷删除。 | **id**, **action** |
| `zujuan_paper_switch_question` | 组卷中心「换题」：不传 newId 时列出可替换的同类候选题；传 newId 则替换成该题。 | **id**, newId |
| `zujuan_paper_analysis` | 组卷中心「试卷分析」：整体难度、考查范围、题型分布、难度分布、细目表、知识点分析。 | — |
| `zujuan_save_paper` | 组卷中心「保存试卷」：保存到「我的-试卷存档」，之后可在存档中继续编辑或下载。 | name |
| `zujuan_share_paper` | 组卷中心「分享试卷」：为当前试卷生成电脑端链接、手机端链接（及二维码）。 | — |
| `zujuan_answer_sheet` | 组卷中心答题卡：kind=download 打开「下载答题卡」，kind=make 打开「制作答题卡」。返回对话框内容，之后可用 browser_snapshot / browser_click 选择样式，browser_wait_for_download 下载。 | kind |
| `zujuan_similar_questions` | 查找某道题的相似题（站点「相似题」功能），返回候选题 id 和题干。 | **id**, bankId |
| `zujuan_knowledge_explain` | 知识点解读（站点「解读」按钮，需要会员）。cid/cname 来自试题详情的知识点。 | **cid**, cname, bankId |
| `zujuan_favorite_question` | 收藏 / 取消收藏试题（收藏的试题进入个人题库）。 | **id**, bankId, favorite |
| `zujuan_download_history` | 我的-下载记录：最近下载过的试卷（名称、日期、题量、格式、文件地址）。 | days, page, pageSize |
| `zujuan_archives` | 我的-试卷存档：保存过的试卷。 | days, page, pageSize |
| `zujuan_favorite_papers` | 我的-收藏的试卷。 | page, pageSize |
| `zujuan_personal_questions` | 个人题库：收藏的试题，可按关键字、题型、难度筛选。 | bankId, keyword, page, quesType, quesDiff |
| `zujuan_load_paper_to_center` | 把「试卷存档」或「下载记录」中的试卷载入组卷中心继续编辑（相当于其「编辑」按钮）。组卷中心已有试题时需 overwrite=true 才会覆盖。 | kind, **id**, overwrite |
| `zujuan_delete_archive` | 删除一条试卷存档。 | **id** |
| `zujuan_delete_download_record` | 删除一条下载记录。 | **id** |
| `zujuan_redownload` | 重新下载「下载记录」中的试卷文件到本地下载目录（不重新生成、不占下载次数）。 | **id** |
| `zujuan_ques_use_history` | 我的-选题记录：最近用过（加入试题篮/组卷/下载）的试题。 | days, page, pageSize |
| `zujuan_read_all_messages` | 把站内消息全部标为已读。 | — |
| `zujuan_messages` | 站内消息：未读数量和最新一条未读消息。 | — |
| `zujuan_list_topics` | 精品专辑：按学科浏览或按关键字搜索专辑（如 "真题汇编"、"高频考点"、"期末复习"）。 | subject, keyword, url, page |
| `zujuan_topic_detail` | 打开专辑详情：专辑信息、同系列子专辑、目录（各专题 URL），以及当前专题下的试题。打开某个专题 URL 可读其试题；试题可用 zujuan_add_to_basket 加入试题篮。 | **url** |
| `zujuan_good_lessons` | 上好课（同步备课）：打开学科的上好课页面并列出资源。 | subject |
| `zujuan_api` | 高级：在已登录的组卷网页面内直接调用站内接口（/zujuan-api/...），用于专用工具没有覆盖的功能。method 默认 POST（表单格式）。 | **path**, data, method |
| `browser_navigate` | 打开网址。相对路径会补全为 https://zujuan.xkw.com 下的地址。 | **url** |
| `browser_back` | 浏览器后退。 | — |
| `browser_snapshot` | 获取当前页面的可访问性快照（ARIA 树，含元素角色与文本），用于理解页面结构并决定点击哪个元素。 | selector |
| `browser_get_text` | 获取页面（或某个 CSS 选择器）内的可见文本。 | selector, maxLength |
| `browser_click` | 点击元素。可用 CSS 选择器，或用可见文本（text）定位；同名元素多时可用 nth 指定第几个（从 0 开始）。 | selector, text, exact, nth |
| `browser_type` | 在输入框中输入文本（会先清空）。 | **selector**, **text**, submit |
| `browser_press_key` | 按下键盘按键，如 Enter、Escape、PageDown。 | **key** |
| `browser_screenshot` | 截取当前页面截图。 | fullPage, selector |
| `browser_evaluate` | 在当前页面执行一段 JavaScript 表达式并返回结果（JSON 序列化）。可用于读取站点全局对象，如 window.ZujuanCom.Paper.GetQuesIDList()。 | **expression** |
| `browser_wait_for_download` | 点击一个下载按钮并等待文件下载完成，保存到本地下载目录。 | selector, text, timeoutSec |
| `browser_tabs` | 列出所有标签页，或切换/关闭某个标签页。 | action, index |
| `browser_set_visible` | 切换浏览器为可见窗口（visible=true）或无头模式（visible=false）。会重启浏览器，保留登录态并重新打开当前页面。 | **visible** |

加粗的参数为必填。
