# Jacob Travel 接续交接

更新：2026-10-03。目的：切换到全新 Codex 对话，保留进度与证据；不是新一轮全程旅行规划。

## 1. 先读与范围

1. 进入唯一项目 `C:/Users/50415/OneDrive/文档/ChatGPT/Travel/travel-os-ui-redesign`。
2. 读本文件、`README.md`、`artifacts/visual-qa-20261001/qa-progress.json`；后者按迭代保留实际操作、截图修正与审核范围。
3. 运行 `git status --short`、`git branch --show-current`、`git log -8 --oneline`，再确认远端备份。不要对父目录 Travel 仓库执行开发或提交。
4. 项目分支必须是 `codex/visual-qa-20260929`，远端 `https://github.com/504150770/travel-os.git`。

用户最重视前端视觉、字体和排版，要克制、清晰、接近 Apple/Meta 气质；不是无休止换设计。保持用户提供的城市图片、banner 和 Jacob 头像。只优化有实质证据的已有功能，不新增功能，不改旅行事实、城市顺序、酒店、住宿日期、国际航班、Current Plan、预算、签证或推荐算法。

## 2. 版本与发布边界

| 层次 | 已知基线 |
| --- | --- |
| 交接前 GitHub QA 备份 | `10592cfe7e69089dee808198fa0dd7faafb37150`，远端已核对；文档后续提交以 Git log 为准 |
| 最近功能/视觉修复 | `1dcb014` 手机离线操作层级；`626b75b` More 当前 tab 可见；`0cce659` Booking 状态选项；地图修复等详见 QA 日志 |
| 已记录的生产发布 | 用户此前授权的 Home 城市入口版本，Vercel `dpl_GtPDHjQ8P8zSC1iJDMgutGqSjFqK`，域名 `travel.jacob.xin` |
| 当前 QA 分支状态 | 后续多轮修复仅 GitHub 备份，未自动上线；新线程不要自动部署 |

不要说“从未部署”，也不要说“最新分支已经全部上线”。本次交接没有重新验证生产发布状态；以上生产信息来自已有实际发布记录。`.travel-build-state.json` 的 `handoff_allowed/source_commit` 是生成的结构审计，不是最新 HEAD、真实用户状态或全系统验收结论。`qa-progress.complete` 仍为 `false`。

## 3. 已验收，不重复重设计

- 桌面 Trip/Readiness/酒店/Discover/Plan/More，手机 Today/Home/Explore/Plan 各 tab/酒店/备份/实用信息等已有局部 High 认可；详情以日志实际范围为准。
- Day 2/8/15 桌面 1440×900、1280×800、1024×768，以及手机 375/390/430 的布局与到底可访问已有组合覆盖；不等于每项功能在每尺寸都测过。
- Gallery 多图/单图、方向键、顶层 Escape 与详情焦点，Timeline 操作/Undo、收藏持久化、部分状态修改在隔离 origin 有实际记录。不要用模型测试代替这些操作证据。
- 地图按需加载、实例复用、Drawer 禁止背景交互、切日清除旧 preview、密集 marker 第一次分离/第二次准确选择已有实际与源码证据。DOM/server/build 证据不等于浏览器 Network 或性能测量。
- 手机 Booking 修复防止 `To Book/Research` 被控件错误显示为 `Pending`；没有改真实订单。More 深链当前 tab 自动进入可见范围，只滚横向栏。

最近完成：手机 More 离线页的 `OfflinePackControl` 补齐 padding/标题/元信息层级；下载和 GPX CTA 使用已有安全深蓝 `#2478ad`，仅 mobile panel CSS。375/430 实图获 High 明确局部满意。真实 D15 GPX 导出到本地，XML 有 5 个合法 routepoints；未上传导出、未点击真实 3000 离线包下载。disabled 样式仅源码检查，未实测 disabled 截图。证据：

- `artifacts/visual-qa-20261001/mobile-offline-panel-fixed-top-375.jpg`
- `artifacts/visual-qa-20261001/mobile-offline-panel-fixed-bottom-375.jpg`
- `artifacts/visual-qa-20261001/mobile-offline-panel-fixed-430.jpg`

## 4. 尚未闭环与优先级

| 优先级 | 工作 | 已知边界 / 下一步 |
| --- | --- | --- |
| P0 | 隔离自定义项清理及永久删除实际验收 | `localhost:3001` 曾保存唯一 agent 测试项 `QA 临时保存验收`，当前是否残留须先只读确认，仅允许处理该项。保存/刷新已实测，原生 confirm accept 超时，删除结果未知；`d3844df` 删除/Undo 防孤儿引用修复只有源码与模型证据。服务已停。先用正式 Chrome 接口检查现有能力/状态，只有条件变化才重试。不能注入 storage、删除其他项或碰真实 3000 |
| P0 | Backup Restore E2E | 文件选择接口被扩展 `Allow access to file URLs` 权限阻断。不得绕过或擅自开权限；条件不变就记录，继续能做项。原始/已保存私人备份留 Downloads，不上传 |
| P1 | 未覆盖的真实功能边界与最终视觉收口 | 对照每个迭代的 actual/remaining，仅补有证据缺口的交互、详情、菜单、搜索、收藏/Timeline 边界；不要重复已认可页面或创造问题。功能验证后给整体 High 评审，但不能先宣称全部满意 |
| P1 | 完整网络离线及运行性能 | 仅停止隔离服务器的缓存壳测试已通过，不代表外部网络全断。正式浏览器工具无断网能力时清楚说明；不要读任意 runtime/performance/storage 或用 raw CDP 绕过。构建大小不是 LCP/实测速度 |
| P2 | 依赖告警分流 | 之前误用 `pnpm audit` 得到 37 条依赖告警，未修。属于单独安全维护范围，先只读分级，不夹带大规模依赖/lockfile升级 |

当前普通 Chrome 控制与 High 评审已恢复；旧原生弹窗/Restore 限制并未因此自动解除。不得反复调用未变化的失败。用户最终美学批准和全系统实际 High 满意仍未获得。

## 5. 继续执行方式

流程：GitHub 可回退备份 → 实际运行/截图 → 授权 ChatGPT High 审核 → 明确小范围任务 → CodeBuddy 可用则辅助、否则 Codex 自己开发 → 相关回归/源码审查 → 新截图复核 → 准确记录。无强行固定轮数、不为轮数制造问题。记录阻碍继续其他能做的工作。

只用 Chrome 技能正式接口及用户 Jacob Chrome。新对话需自己完整读取技能并初始化其自己的浏览器 runtime；旧 Node bindings/tab/session IDs 不可直接复用。保持登录权限，禁止 raw CDP、独立 Playwright、browser profile/storage 注入、系统鼠标替代鉴权或强制杀/重启 Chrome。

有效 High 延续对话（用户授权原“整理酒店信息”的续接，当前标题可能是“核验Gym详情”）：

`https://chatgpt.com/g/g-p-6a805767bdd88191abdb60cf292d08e9-travel/c/6abdd47e-7d30-83e8-a535-f4e19fa74f85`

原 `6a9f6322-2fe8-83e8-966c-46da74ba76a0` 已满，禁止重复发原满额对话。每次核对实际 High 模式和本轮新回复，不能拿以前满意当本轮审核；若续接也满，走页面现有 Start new chat 并更新准确 URL。

截图须真实 foreground 页面，设置尺寸后等待新 DOM/完成绘制，再截图并本地视觉检查。图只证明可见画面；持久化、焦点、实例、文件下载要单独实际证据。日志里的 `evidenceCorrection` 必须保留，错误尺寸/旧画面不能发审核。不上传私人签证、备份、文档或凭证，仅公共/默认页面与本轮必要源码。

服务默认 `http://localhost:3000`，已有服务则复用、只读检查；不能终止未知进程。状态修改测试用独立 origin，先导出基线，可撤销修改后真实 UI 撤销并验证；隔离 3001 已停，必要时只启动自己的实例并确保不影响 3000。端口隔离不代表同浏览器该 origin 无历史状态。

永久删除清理不是 Undo 测试：仅清理上述已知临时项，随后通过 UI 再导出，与 Downloads 中既存 `europe-travel-os-2026-10-02.json` 基线比较业务字段，确认自定义库及各计划区无残留或孤儿引用，再提交实际截图/操作证据给 High。不得声称删除可 Undo，不能批量清理其他数据。

## 6. 验证与脏文件保护

上次源码修复完成后已通过：typecheck、lint、build、项目 audit、全部现有 regression 和 gallery-copy。此次交接仅文档，不重复宣称新跑源码测试。

源码修复后的收尾命令（先跑相关测试，最后必要全套）：

```powershell
pnpm typecheck
pnpm lint
pnpm build
pnpm run audit
foreach ($qaTest in @('test:linkage','test:architecture','test:mobile','test:desktop-workspace','test:trip-presentation','test:travel-intelligence','test:readiness','test:backup','test:presentation','test:gallery-offline')) {
  pnpm run $qaTest
  if ($LASTEXITCODE -ne 0) { throw "Regression failed: $qaTest" }
}
node scripts/gallery-copy-test.mjs
```

`pnpm run audit` 才是本项目审计脚本，且写生成文件；`pnpm audit` 是依赖告警检查，二者不能混淆。现有项目审计 0 failures / 1 warning：预计 ¥27,630 超过不变的 ¥26,000 硬预算 ¥1,630，不是 UI 故障，不许修改数值掩盖。

当前未提交变化包括 `.travel-build-state.json`、`audit/*`、`public/offline-core.json`、`tsconfig.tsbuildinfo` 与若干用户/旧截图/日志。另有未跟踪 `TRAVEL_AUDIT_PACKET.md` 等，不是授权变更；旧审计包不能代替最新订单/Current Plan，尤其有旧未出票陈述。保留全部，不 reset/clean/delete/批量 stage。仅 `git add --` 明确本轮文件；截图审核需 GitHub immutable commit URL，发布另需用户授权。

## 7. 接续完成条件

先确认 Git 状态与文档交接，继续能安全验证的未完成项。每轮更新 QA 实际字段与准确限制。只有全部功能有真实证据、ChatGPT High 明确整体满意（并尊重用户视觉批准/发布权限）才能结束；局部满意、全部 build/test 通过、工具暂时受阻均不是整体完成。

此旧线程完成交接后不再同时开发；`jacob-travel` 原 30 分钟 heartbeat 应通过产品正式接口转到新线程，保留“未变化安静、有实质改善/完成/需介入才通知”的偏好，不创建重复自动任务。
