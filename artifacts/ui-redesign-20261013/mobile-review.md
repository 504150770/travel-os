# Today / Explore 源码交接

日期：2026-10-13。分工 B 已完成指定源码和定向检查，停止写入。真实浏览器、构建、全量检查、业务字段比对和 Git 提交由经理统一完成。

## 变更范围

- `components/mobile/MobileToday.tsx`
- `components/mobile/MobileExplore.tsx`
- `components/mobile/mobile.css`：首段 token aliases、Today 样式及其窄屏概览规则。
- `components/mobile/mobile-explore.css`：仅 `.mobile-explore` 下的列表、上下文和操作样式；既有共享 `MobilePlanTarget` 样式保留。
- 新增 `scripts/mobile-workbench-test.mjs`。
- 本报告。

没有修改旅行事实、Current Plan、数据文件、推荐/预算/签证算法、private 或依赖。没有 Git 写操作、构建、审计生成、服务、浏览器或 storage 操作。底部 dock、Sheet、地图、Plan 和 More 的布局未编辑；首段 mobile aliases 按分工读取经理的全局 theme。

## 页面调整

Today 的日期选择和天气并排，主题标题缩小，城市单独显示。首站沿用原 rows 筛选逻辑，普通景点标为“今日首站”，酒店/活动 fallback 按经理后续修正保留“行程起点”；时间与导航更清楚，首站名称新增详情按钮，没有实时“下一站”的暗示。酒店、当天交通、订单与票据入口和当天提醒均保留。

四项概览改为两列网格，离店、安排数、已知步行和返程无需横滑。当天行程合并为一个白色 surface，时间列、图片、名称、状态、时长、支持信息与更多按钮分层排列；出发/返回酒店和各路段展开参考保留。备选提升、removed 恢复、餐饮、健身、Tips 和明日入口保留，餐饮/健身展开后移除重复标题。

Explore 改为单列宽卡：104px 图片、城市/分类、名称、已有说明一行和价格信息。说明优先使用实体 description，其次实体 notes；都空时仅读取当前目标日的精确 placement 对应项目备注，没有可用说明时显示现有通用详情提示。收藏独立位于卡片底部，目标 Day 与加入按钮并列。搜索、清除、分类、城市、详情与图片入口保留，分类和收藏增加 `aria-pressed`。城市与目标日期并排，顶部保留推荐数量。

Today / Explore 主操作使用 `var(--mobile-accent)`，hover 使用 `var(--accent-hover)`；第一段 aliases 使用 `var(--accent)` / `var(--accent-soft)` / `var(--ink)` / `var(--ink-soft)` / `var(--line)`，surface 读取 `var(--surface)`。More 既有 `#2478ad` 字面规则在本分工范围外，没有修改；经理的 product theme 已覆盖其最终显示。

## 交互边界

- Explore 的 placement 仍按 `entity.id + controller.selectedDay` 查询。正式已加入 disabled；当天备选调用原 `transfer(dayId, itemId, 'alternatives', 'activeItems')`；未加入调用 `addEntity(entity.id, selectedDay, 'activeItems')`。其他日期的 placement 不禁用当前目标日期。
- `MobilePlanTarget` 继续绑定 `controller.selectMobileDay`，城市/分类继续使用移动端专用回调；没有引入目标日期本地 state。
- 收藏仅合并 favorites；详情、收藏、加入三个操作保持独立，无按钮嵌套。
- 说明查找要求 `planDay.dayId === selectedDay`、`placement.dayId === selectedDay`、区域明确为 trip/backup，以及 `item.id === placement.itemId && item.entityId === entity.id`。trip 仅查 activeItems，backup 仅查 alternatives；别日、removed、未知区域与无 placement 不提供项目说明。传给现有 `placeOverviewCopy` 的备注保持原文，保留其精确既有文案转换。搜索匹配规则未修改。
- Today 保留 `openActions({ item, entity, index, total: rows.length })`、酒店 `!stay` disabled、Plan 交通/票据跳转、当天提醒、两类 pool transfer 和 `selectMobileDay(day.day + 1)`。

## 首版检查记录

以下是首版交接时的运行结果，保留当时旧 presentation guard 的失败证据；不代表经理后续统一检查的状态。

| 检查 | 结果 |
| --- | --- |
| `pnpm exec oxlint components/mobile/MobileToday.tsx components/mobile/MobileExplore.tsx` | 通过，exit 0 |
| `pnpm exec oxlint scripts/mobile-workbench-test.mjs` | 通过，exit 0；修正新测试自身两处 lint 提示后运行 |
| `pnpm exec tsc --noEmit --incremental false` | 通过，exit 0；没有写 tsbuildinfo |
| `node --experimental-strip-types scripts/mobile-workbench-test.mjs` | 通过，exit 0 |
| `node --experimental-strip-types scripts/explore-promotion-test.mjs` | 通过，exit 0；真实 hook transfer/undo 保留原备选字段 |
| `node --experimental-strip-types scripts/mobile-shell-test.mjs` | 通过，exit 0 |
| `node --experimental-strip-types scripts/mobile-practical-boundary-test.mjs` | 通过，exit 0 |
| `git diff --check --` 指定四个源码文件和新测试 | 通过，exit 0；仅 Git 的 LF/CRLF 提示 |
| `node scripts/presentation-test.mjs` | 未通过：line 40 的旧 Home 字面 guard `/A Winter Journey Through Six Cities/` 与并行首页重设计不符；未修改/弱化旧测试，后续断言未执行 |

新测试通过 TypeScript transpile + VM、内存 React state adapter 执行真实 Today/Explore 的 JSX 与回调，并执行真实 `MobilePlanTarget` select handler。覆盖搜索 name/description/tags、清除、分类、城市、目标日期、独立收藏/详情、正式 disabled 无写、备选原 itemId 提升、别日与新目标日期添加、首站语义、四项概览、天气 prop、快捷入口、提醒、more payload 的 index/total、备选/removed 转移、明日/末日，以及冻结 fixture 不被修改。presentation 和 controller/storage 是内存适配，不声称真实存储或端到端验收。

## Explore 空说明小修（2026-10-13）

经理在 IAB 3010 的真实页面发现前七个核心景点的实体 description/notes 为空，首版宽卡只渲染 description，因此出现空段落。此次只接续编辑 `MobileExplore.tsx`、`mobile-workbench-test.mjs` 和本报告。卡片现在优先显示已有实体 description/notes；两者都空时仅读取当前目标日精确 placement 对应的正式/备选项目 notes，最后使用已有 `placeOverviewCopy` 的“查看地点详情与票务信息”。没有新增或推断景点事实，未改共享 helper、CSS、数据或计划。

| 本次小修检查 | 结果 |
| --- | --- |
| `pnpm exec oxlint components/mobile/MobileExplore.tsx` | 通过，exit 0 |
| `pnpm exec oxlint scripts/mobile-workbench-test.mjs` | 通过，exit 0 |
| `pnpm exec tsc --noEmit --incremental false` | 通过，exit 0 |
| `node --experimental-strip-types scripts/mobile-workbench-test.mjs` | 通过，exit 0，新增说明矩阵后运行 |
| `node --experimental-strip-types scripts/explore-promotion-test.mjs` | 通过，exit 0 |
| `node --experimental-strip-types scripts/mobile-shell-test.mjs` | 通过，exit 0 |
| `node --experimental-strip-types scripts/trip-presentation-test.mjs` | 通过，exit 0 |
| `git diff --check --` 本次三个指定文件 | 通过，exit 0；仅 LF/CRLF 提示 |

新增 16 个说明用例执行真实 Explore JSX，并加载真实 `placeOverviewCopy`：核心实体空说明、trim 后实体描述/备注优先级、精确 trip/backup 备注、乱序 days、错 itemId、错 entityId、别日 placement、错误 pool、removed、未知区域、无 placement、真正无说明和纯空白内容。另验证目标日缺失、真实 `MobilePlanTarget` 的 Day 2→3→2 切换、helper 对原内置备注的精确转换及用户编辑备注原文保留。实体、计划和 placement fixtures 冻结并比对前后快照。经理已经修正的 Today“行程起点/按行程顺序”测试完整保留。

本次未运行构建/审计、浏览器或服务，也未写 Git/storage。源码小修与定向检查已完成，停止写入。经理仍需在真实默认核心数据上确认说明来源、单行省略和目标日切换；测试适配器不能代替该实际验收。

## 待经理真实验收

1. 375 / 390 / 430：日期天气头部、长首站名称、两列概览的完整返程信息、时间线多行名称/支持信息、卡片简介省略、所有底部入口可达，页面无横向溢出。
2. Explore 目标 Day 改动后的 URL / 刷新持久化，以及城市/分类切换保留目标 Day。
3. 真正的收藏持久化、详情独立点击、正式 disabled、当天备选提升的原字段、别日重复添加规则及 Undo。
4. Today 酒店、交通/票据、日期、提醒、时间线更多、路段展开、餐饮/健身、备选与 removed 恢复的触控和焦点。
5. 与经理最终 theme 合并后的图片、颜色对比和 CSS 加载顺序；全量检查与旧 presentation guard 统一处理。

本报告仅说明分工 B 的源码状态，不能代替经理的实际截图、真实交互、业务字段比对或全系统验收。
