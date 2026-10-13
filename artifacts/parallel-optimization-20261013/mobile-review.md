# 手机 Today / Plan 与桌面 Plan 操作边界审查 · 2026-10-13

仅在 `travel-os-ui-redesign`、`codex/visual-qa-20260929` 的共享 checkout 操作。已完整读取 HANDOFF、README、恢复/离线/性能 REVIEW，以及前端实用性第一、第二批 REVIEW。以本轮人工指令为准：自主验收，不恢复自动任务，不发送 High，不部署。

## 两个实质问题及修复

### 1. 已出票国际机票的状态编辑必然被覆盖

具体触发：手机 Plan → 订单 → `flight-can-fco` 或 `flight-cdg-can` → 修改状态。原控件仍允许选择 Cancelled / Pending 等状态；`useAppController` 的 `effectiveBookingStatuses` 每次强制这两个既有订单为 Ticketed，因此选择会写入本地覆盖值，但界面立刻继续显示 Ticketed。

修复：`mobileBookingStatusEditable` 按现有 TICKETED 航段与原有订单映射判断。手机订单保留状态、票据和详情入口，已出票航段不显示这个无效状态编辑；变更处理器也检查同一边界。其他订单包括未出票欧洲交通、用户管理的景点票状态仍可编辑。没有改变任何订单事实或控制器规则。

### 2. 订单派生完成的任务 / 关键日期提供了无效撤回按钮

具体触发：手机 Plan → 关键日期或待办 → 国际机票已出票 → 点击“已完成”。原处理器写 Waiting，但 `mergeBookingActionStatuses` 立即把 `deadline:transport-international` 恢复 Done。相同问题也发生在 Booked / Paid 等景点订单关联的关键日期、以及斗兽场任务别名。

修复：复用 `mergeBookingActionStatuses` 与 `buildActionQueue` 的现有规则识别订单派生完成项，显示“由订单状态自动完成”，不再提供无效撤回按钮。判定时把手工任务作为 Open 输入，只识别订单派生结果，不把默认或手工 Done 误当锁定。手工待办、在线入住仍可完成及重新打开；用户管理的景点订单恢复 To Book 后，其派生任务 / 关键日期恢复原操作入口。没有增加完成规则。

## 已检查但没有改动

- Today 的酒店入口使用当前 `stay`；无住宿时 disabled。
- Today 的交通 / 订单快捷入口先切 Plan，再选择对应 tab；两步均保留 selectedDay。当天提醒调用原 `openAction`，使用同一 action id 和目标 tab。
- 今天、明日选择复用原 `selectMobileDay`。Day18 不显示不存在的明日入口。
- 交通与订单当天分组保留原日期规则，已出票跨夜航班在抵达日可访问；未核实候选抵达日期不会变成当天正式航段。酒店退房 / 入住交界日保留两个相关订单。
- Plan 横向 tab 自动进入可见范围仍在；按日期重建订单 / 交通展开状态的 key 未变。
- Today、MobileTransportPanel、Map、Drawer、More、Sheet 和 app controller 无修改。

## 验证

- 新 `scripts/mobile-practical-boundary-test.mjs` 转译并执行实际 `MobilePlan`，调用实际状态处理器；React effects / lazy UI 和状态存储是内存适配，订单、任务和派生规则使用真实共享模型与公开源码数据。没有浏览器操作或本地运行数据读取。
- 修复前首先真实触发断言：国际机票仍有状态 select（1 而非 0）。先修机票后，再触发第二条断言：关键日期派生完成项仍有撤回按钮（1 而非 0）。全部修复后新检查通过。
- 覆盖两张锁定国际机票、国际机票的任务 / 关键日期别名；Ticketed / Booked / Paid / Confirmed / Completed 五种景点状态及恢复 To Book；手工 Done 重新打开再完成、在线入住两向切换、未出票欧洲交通仍能改状态。渲染与处理器检查没有改变源事实数据。
- `node --experimental-strip-types scripts/mobile-plan-test.mjs` 通过：原当天订单、跨夜抵达、订单映射及交通事实保持。
- `pnpm exec oxlint components/mobile/MobilePlan.tsx components/mobile/mobileTransportModel.ts scripts/mobile-practical-boundary-test.mjs` 通过。

本分工没有运行全局 typecheck / 总回归 / build / audit；由主线程统一完成。没有 stage、commit、push、服务重启、原脏文件还原或清理。

## 桌面授权接续

主线程审阅手机结果后明确扩展分工到 `views/plan/PlanView.tsx`、`components/execution-cards.tsx` 的 DeadlineCenter、纯共享 `features/plan/interactionModel.ts` 和独立桌面回归。原范围外建议现已在该授权内处理。

- 桌面已出票国际机票原先也有无效状态 select，现以原有状态样式显示 Ticketed，详情及资料入口保留；其他订单仍可编辑，处理器保留边界检查。
- 桌面交通原先对已出票航段 / 候选仍显示 Select as Preferred。现使用手机的同一个 `transportPreferenceAllowed`，可见入口与写入处理器均保护 segment 和 candidate；未出票欧洲交通仍可设置偏好。没有清理或改写既存偏好。
- 桌面订单派生完成任务的 select 原本 disabled，但完成图标按钮仍能写 Open；现两个控件均只读，处理器也拒绝派生完成状态写入，辅助文字与按钮名称说明由订单自动完成。
- DeadlineCenter 新增可选 `bookingSyncedIds?: ReadonlySet<string>`。Plan 传入派生集合，完成项 select 只读、处理器拒绝撤回，并说明来源；未传参数的其他调用方保留原行为。该文件仅 DeadlineCenter 有变更。
- `interactionModel.ts` 承接原手机的订单派生集合计算，复用现有 `mergeBookingActionStatuses` / `buildActionQueue`。订单只读和交通偏好边界直接重导出现有纯交通模型的函数；没有第二套映射或复制规则。手机与桌面使用相同派生集合，交通可写判定为同一个函数引用。

新增 `desktop-practical-boundary-test.mjs` 执行实际 PlanView / DeadlineCenter / 共享模型，修复前首先断言失败于国际机票仍有 select。修复后验证已出票订单、两张已出票航段、任务 / 日期别名、五种已完成景点状态与真实处理器恢复 To Book、手工 Done / Doing / Ready 修改、正常交通偏好，以及新变为 TICKETED 的 segment 或 candidate 对已取出处理器的保护。直接调用 disabled 任务 / 日期处理器也不写入。另验证不传新可选参数时 DeadlineCenter 原编辑行为保留。全部仅内存模型，没有读取或写入运行中的浏览器数据。

桌面接续后的相关检查：两个新增 practical-boundary 脚本、既有 mobile-plan 脚本与 presentation 源码回归均通过。已检查 diff，execution-cards 仅 DeadlineCenter 改动，tracked diff whitespace 检查通过。

最终 lint 记录：包含整个 execution-cards 文件的定向命令报告唯一错误 `execution-cards.tsx:89:33 eslint(no-unused-vars)`，来自未改动的 `TodayAtGlance({ day, route })` 中未使用的 `day` 参数。已只读核对 HEAD 原文件具有相同函数及未使用参数；不是本轮 DeadlineCenter 新问题。按只准修改 DeadlineCenter 的授权保留该函数。去掉 execution-cards 后，PlanView、interactionModel、手机 Plan / 交通模型和两个新脚本的定向 lint 全部通过。不能把包含 execution-cards 的整文件 lint 说成通过；主线程可评估该既有告警。未为通过检查修改其他组件或禁用规则。

## 留给主线程的真实 UI 边界

1. 手机 375 / 390 / 430：从 Today 的订单入口进入 D2，确认已出票国际机票没有修改状态，但资料和详情仍可打开；Day17 / 18 确认返程订单及跨夜分组。
2. Plan 关键日期、待办：国际机票显示完成及来源说明，没有撤回动作。确认短说明与长标题在手机上正常换行。
3. 仅隔离 origin：把斗兽场订单改 Booked，核对任务 / 关键日期共享完成状态和来源说明；再通过 UI 恢复原订单状态，确认操作入口恢复。手工待办和入住仍可两向切换，并按主线程导出基线撤销验证。
4. 日期选择、横向 tab 自动可见、Today 提醒的滚动 / 焦点及资料按钮懒加载仍需主线程真实交互。源码和本轮模型检查不算这些界面的 E2E 或视觉证据。

## 桌面真实 UI 复测边界

- 桌面 Plan 订单摘要：国际机票状态展示 / 展开详情的布局和点击，普通订单 select 的既有操作。
- 桌面交通：已出票航段没有偏好按钮，未出票候选仍可选择；行李、来源与退改信息保留。
- 桌面待办 / 日期：由订单完成项不可撤回，但普通任务及日期仍可修改；disabled 控件的实际键盘表现及长文字换行。
- 隔离 origin 的 Booked → To Book 与资料入口实际联动、基线导出和 UI 撤销由主线程执行。模型验证和源码回归不冒充真实 UI 或视觉证据。

本轮写入仅 `MobilePlan.tsx`、`mobileTransportModel.ts`、`mobile-plan.css`、`PlanView.tsx`、`execution-cards.tsx` 的 DeadlineCenter、共享 interactionModel、两个独立回归脚本与本报告。旅行事实、默认 Current Plan、日期、预算、签证、推荐算法、依赖和图片保持；没有浏览器业务数据写入。全系统 QA 完成状态不由本报告改变。
