# Home 预算入口审核包

状态：源码修复已测试并备份；真实浏览器刷新、截图和指定对话 High 审核未完成。未合并、未部署。

- 仓库：`504150770/travel-os`
- 源分支／SHA：`codex/visual-qa-20260929`／`395cb61c36be1ddb77b8693981d8b8dd3b95fd81`
- 修复分支／目标 SHA：`codex/cloud-necessary-fixes-20261003`／`5d399521b6a1bb392a307c359fa03054fcb80550`
- [不可变修复提交](https://github.com/504150770/travel-os/commit/5d399521b6a1bb392a307c359fa03054fcb80550)
- [详细测试与渠道材料](budget-navigation.json)；该 JSON 保留本轮准确证据边界。

## 必要问题与真实源码 diff

Home 的预算“查看明细”设置了预算面板，但 URL 保留先前 Plan tab；刷新或重新打开时 applyUrl 会读取旧 tab。下面是实际 `git diff 395cb61c36be1ddb77b8693981d8b8dd3b95fd81 5d399521b6a1bb392a307c359fa03054fcb80550 -- features/app/useAppController.ts` 输出；唯一源码变化是四行 URL 同步。

```diff
diff --git a/features/app/useAppController.ts b/features/app/useAppController.ts
index 61080f3..127b8ca 100644
--- a/features/app/useAppController.ts
+++ b/features/app/useAppController.ts
@@ -451,6 +451,10 @@ export function useAppController() {
   const openBudget = () => {
     navigate('plan');
     setPlanTab('budget');
+    writeUrl(
+      { view: 'plan', tab: 'budget', day: null, city: null },
+      'replace',
+    );
   };
 
   return {
```

## 人工复现与验收步骤

1. 只在隔离测试 origin 上运行指定提交；不读取／修改真实用户预订、旅行状态或私有资料。
2. 从 Plan 选择任意非预算 tab（例如 bookings），回 Home，点击预算“查看明细”。
3. 在源 SHA：面板为 Budget，URL 仍是 `view=plan&tab=bookings`。这是本轮控制器测试已复现的错配；真实浏览器复现仍待完成。
4. 在目标 SHA：面板与 URL 均为 Budget／`view=plan&tab=budget`；刷新及重新打开复制的链接，应保留预算面板。
5. 从 readiness、transport、checkin、deadlines、tasks 补查相同路径；原已选 budget 的路径也应正常。检查 Back 返回 Home，没有额外重复 Plan 历史条目。
6. 全程不编辑预算、订单或状态。验证后采集真实截图，提交下述既有对话的新一轮 High 审核。

## 已完成测试与边界

- 源与修复后：typecheck、项目 lint、build、项目 audit、全部十项既有 regression、gallery-copy 均 exit 0。
- 隔离测试执行真实 useAppController／useUrlState，使用内存 React hooks 和 history doubles：修复前六个非预算 tab 错配，修复后七个 tab 全通过；URL／面板一致、hash 保留、仅一个 history push、导出业务字段不变。
- 这是控制器测试，不能代替真实浏览器点击、刷新、Back、截图或 High 验收。
- 项目 audit：0 failures／1 原有 warning，预计 ¥27,630 相比 ¥26,000 上限超 ¥1,630；未改金额。
- data、lib、package.json、pnpm-lock.yaml 无差异。生成 audit／build 文件保留未暂存，原 checkout 保留。

## 待采集的真实截图

- 源 SHA：非预算 tab 返回 Home 后点击“查看明细”，同时展示 Budget 面板和仍为旧 tab 的地址。
- 目标 SHA：相同操作后，Budget 面板和 `tab=budget` 地址一致。
- 目标 SHA：刷新／重新打开后 Budget 仍保留；另记录 Back 返回 Home 的真实操作证据。截图不能单独证明持久化或历史行为。

本轮新截图为零。云端没有可用的正式 Jacob Chrome 控制接口；父任务另核查其云端 Chrome 后，指定审核对话仍跳到登录页。没有绕过权限、重新包装历史截图或拿内部评审替代。

## 原对话审核与自动触发核查

[必须使用的既有审核对话](https://chatgpt.com/g/g-p-6a805767bdd88191abdb60cf292d08e9-travel/c/6abdd47e-7d30-83e8-a535-f4e19fa74f85)：需确认本轮 High 模式、新回复及真实截图。当前未发送新审核，未获得本轮认可；用户休息期间保持等待，不扩大修改。

2026-10-03 本轮只读检查针对目标 SHA：

- 源码没有 `.github` workflows。
- 已连接 GitHub GET `actions/runs?head_sha=5d399521b6a1bb392a307c359fa03054fcb80550&per_page=100`：`total_count=0`，不受 PR-only wrapper 范围限制。
- GitHub commit check-runs：`total_count=0`；combined-status 接口：`statuses=[]`。未发现该修复触发 Actions 或部署状态报告。
- `gh api` 查询 Actions／statuses／checks／deployments 均返回 `Forbidden`；Actions／checks／statuses 已通过连接器复核，但 deployments REST 仍无可用读取能力，也没有 Vercel 项目部署记录工具。因此不能完整排除第三方自动 preview／production 部署，不能把“无状态报告”写成“已确认没有自动部署”。
- Agent 没有创建 PR、合并、触发 workflow 或调用部署工具。仅备份独立分支；QA 源分支 SHA 保持不变。审核包本身的归档提交另在返回父任务时报告。
