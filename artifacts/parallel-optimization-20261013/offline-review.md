# 离线更新失败与并发边界审查 · 2026-10-13

范围仅为源码和 Node 模型。工作目录为 `travel-os-ui-redesign`，分支 `codex/visual-qa-20260929`，开始时 HEAD 为 `30ac563794392d4427b8737efe06b969337c1fc1`。已完整读取 HANDOFF、README、恢复/离线/性能 REVIEW 与前端实用性两批 REVIEW；本轮人工指令覆盖旧 heartbeat 与 High 流程。

## 确认的问题

1. **保留旧缓存不等于旧包仍可打开。** 在线导航可在更新前把普通 shell 缓存替换为新 HTML；更新失败虽保留旧资源包，原 worker 的导航回退仍优先取新 HTML，引用旧包没有的新 bootstrap。新用例以真实 worker 源码执行：`--baseline` 对当时 HEAD 的断言实际失败，得到 `index-new.js` HTML，而预期应为保留下来的 `index-old.js`。不是浏览器断网证据。
2. **半成品参与全局缓存命中。** 原下载直接写版本缓存，失败不删除；之后 `caches.match` 可能取到未完成更新中的新脚本。重试同版本还会跳过这些已写入的条目，未重新核对 HTML 与清单。
3. **成功标记缺少缓存校验。** 原组件直接信任 localStorage 的 ready 字段；资源缓存被移除、部分丢失或不可用后仍可能显示就绪。localStorage 写入不可用也没有异常保护。
4. **点击和页面离开没有统一事务。** 两次点击可在 `serviceWorker.ready` 返回前同时进入；worker 无并发锁。组件卸载未关闭 MessageChannel，重进页面也不能重接仍在执行的下载；worker 不可用或资源响应卡住没有结束路径。
5. **入口选择没有加入清单版本。** 原生成器只散列静态文件内容；同一组文件的 bootstrap 选择改变不影响版本。worker 也不核对下载 HTML 引用与清单是否一致。已只读检查安装的 vinext SSR 源码，它输出带 `src` 的 module bootstrap 标签，与本次校验方式吻合。
6. **独立复查检出的升级边界（P2）。** 本次第一版把发布记录放在版本 shell 中；以后升 shell 时 activate 删除旧 shell，而成功包仍使用 pending 名称，失去指针后无法被接续。新增真实 worker 模型在修改前实际失败：v11 已发布完整包，换 v12 并 activate 后 status 无 pack，资源仍全部存在。已按下述稳定记录修复。

## 修改

- `public/sw.js`：每次更新写独立临时缓存，缓存全部成功并校验 HTML 后，通过稳定专用缓存 `europe-travel-os-pack-metadata-v1` 中的一条记录发布整个包；该名称不匹配 shell 或离线包清理前缀。离线导航从已发布包读取 `/`；应用资源从该包读取，半成品不参与回退。下载/缓存/HTML/发布失败保留旧包，元数据配额失败也不阻断经过完整校验的旧包读取。已完成包的旧 worker 缓存可经完整性检查接续。
- Shell 升至 v12。activate 与状态查询、下载共用迁移/接续 Promise；只迁移旧 shell 中已发布且资源、媒体/应用清单版本、HTML 全部匹配的指针。稳定记录写入成功后才清理有发布指针的旧 shell；配额失败保留旧 shell，readyPack 返回经过验证的旧包。无发布指针的 pending 缓存不被接纳，下载等待迁移完成后再发布，防迟到迁移覆盖新记录。
- Worker 同一时刻只运行一个下载；重复下载或重新进入页面的状态请求订阅该事务。首次旧包接续也共用一个 Promise，防止状态查询与下载重复写接续记录。订阅页消失不阻止 `waitUntil` 中的缓存工作。
- 状态查询实际检查全部资源是否存在；普通资源请求只检查发布记录与请求资源，不逐请求遍历整包。成功更新保留上一版本的完整缓存，供已打开旧代码页面的懒模块加载；重复更新同一版本不挤掉这一前版。
- 每个网络资源含响应 body 有 60 秒截止；组件等待注册 10 秒，等待 worker 消息 65 秒，可退出等待并重试。下载写入及成功后的清理均归 worker 生命周期；清理失败不把已发布成功错误报告为失败。
- `components/offline-pack-control.tsx`：ready 来源改为 worker 实际状态，原 localStorage 标记不再作为证据，也不清理任何浏览器存储。同步 ref 防重复请求；卸载关闭本端消息通道和计时器，忽略旧回调。更新失败有旧包时仍显示就绪，并说明旧包可用。资源数按清单去重；就绪时展示已完成包的数量/大小，避免套用新清单数量。沿用原图标、标题、按钮、样式。
- `scripts/generate-offline-app.mjs`：将构建的 `vinext-client-entry-manifest.json` 的入口选择加入散列并写入 `entry`；入口缺失时拒绝生成，worker 校验 HTML 必须含该入口。老清单无 `entry` 时仍验证其全部 HTML 静态引用。
- 更新 `scripts/offline-app-test.mjs`，新增 `scripts/offline-update-boundary-test.mjs`。没有修改其他脚本、业务数据、默认 Current Plan、日期/预算/签证/推荐算法、依赖、图片、地图、Drawer、Home、features/app 或交接/QA 文档。

## 验证结果

第一轮源码通过：

```text
node scripts/offline-update-boundary-test.mjs
node scripts/offline-app-test.mjs
node scripts/gallery-offline-test.mjs
node --experimental-strip-types scripts/travel-intelligence-test.mjs
node --check public/sw.js
node_modules/.bin/oxlint.cmd components/offline-pack-control.tsx scripts/offline-app-test.mjs scripts/offline-update-boundary-test.mjs scripts/generate-offline-app.mjs public/sw.js
node_modules/.bin/tsc.cmd --noEmit --incremental false
git diff --check -- components/offline-pack-control.tsx public/sw.js scripts/generate-offline-app.mjs scripts/offline-app-test.mjs
```

新模型用例执行真实 worker 和经 TypeScript 转译的真实组件；只有 CacheStorage、fetch、MessageChannel、React 状态/效果与时间适配器使用隔离内存。覆盖：失败升级后的旧 HTML/bootstrap/未访问懒模块；半成品不回退；媒体清单 HTTP503；HTML/清单不匹配与错误入口；缓存发布配额失败后的旧包可读；同版本失败重试；重复请求只下载一次；原页面关闭后另一页面接续并完成；初始状态查询与下载同时接续旧包；成功后仍打开旧代码的懒模块；清理失败不改变成功；缓存局部缺失不报告 ready；响应 body 卡住后释放下载锁并可重试；组件注册未返回时双击只发一次、错误时旧包反馈、卸载计时器/通道清理与迟到消息忽略。

生成器测试覆盖未访问模块、静态内容版本变化、自身不参与散列、bootstrap 选择变化、缺失入口拒绝、缺失图片拒绝；原有 PNG/WebP 逐像素一致检查仍通过。

`--baseline` 是刻意复现旧实现的失败用法，未把这个预期失败记成当前代码回归失败。新增接续锁的初稿曾被并发用例检出重复接续写入（3 次而应为 2 次），已修复，再次完整运行上述针对性测试和检查通过。

P2 追加修复后的最终针对性检查：`offline-update-boundary-test`、`offline-app-test`、`node --check public/sw.js`、针对这三个源码/测试文件的 oxlint、对应 git diff --check 均通过。新增模型覆盖 v11→v12→v13 的已发布指针持久化、迁移配额失败后的旧 shell/旧包保留及后续成功重试、完整但无记录的 pending 拒绝、资源缺失/应用清单版本不一致/HTML 不一致的已发布指针拒绝，以及 activate 迁移未结束时下载确实等待、最终只有接续和新提交各一次。未在追加修改后重复声明全量回归或构建；主线程将统一运行。

## 真实 UI 与交付边界

本分工没有访问任何浏览器、运行 origin、真实业务数据或浏览器 storage，也没有启动/停止/重启服务。没有 build、audit、stage、commit、push、部署、外部 High 或恢复定时任务；主线程独占真实交互、生产构建、完整回归与统一提交。没有还原或清理那十个原始生成脏文件和旧 untracked；typecheck 明确关闭增量写入，生成器仅由测试在自有临时目录执行。

主线程需要在其最终构建上实际复测：旧包下载→发布新版/失败更新→未访问日期刷新及手机 More/Explore/Plan；更新中离开并重回离线页；成功更新后已打开页面的懒模块；旧 worker 的接续与最新计数/提示排版。跨 worker 更替、多次跨版本更新及浏览器强制终止的真实生命周期没有模型之外证据。

**完整外部网络断开仍未实际验收。** Node 的 fetch 拒绝、停服历史和本报告的缓存模型均不等于正式浏览器 Network Offline。没有为这份报告注入浏览器 storage、使用 raw CDP 或改变网络/权限。实际性能与全局 QA complete 结论留给主线程，不能因这些模型通过就宣称全部离线能力完成。

源码和相关模型检查完成；本分工停止写入，由主线程统一收尾。
