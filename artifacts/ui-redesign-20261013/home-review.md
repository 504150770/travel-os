# 首页旅行工作台交付 · 2026-10-13

分工 A 已完成，写入范围仅为 `views/home/HomeView.tsx`、`views/home/home-workbench.css`、`scripts/home-workbench-test.mjs` 和本报告。现在停止写入，等待经理统一验收。

## 交付行为

- 顶部 UI 标题按经理最终反馈显示“欧洲冬日旅程”，`guideData.trip.title` 原事实标题保持原值；日期直接读取真实 startDate/endDate，18 天／6 城由原数据长度计算。旅行阶段继续使用原 `daysLeft` 判定；空值显示“旅行概览”。
- 保留原桌面与手机巴黎封面，以及原六城照片。封面桌面 256px、手机 200px，所选 Day、日期、原 theme 与行程入口直接进入首屏。无效 selectedDay 显示完整行程入口，不回退成默认日期。
- 待办紧接封面，保留 title/detail/due 和原 target 文案；有待办触发 `openNextAction()`，无待办触发 `openReadiness()`。预算、费用待确认数量及行程安排数量全部来自原 props。
- 六城路线保留数据顺序、真实国家／住宿晚数、无障碍名称和 `openCityTrip(city.name)`。入口仅展示固定日期上下文，没有渲染默认 timeline 景点，也没有推断实时下一站。
- 保留原 `data-home-view`、`data-home-hero` 和六项 DOM 性能标记。原 hero eager/high 加载策略、手机 picture source 和 onLoad 标记保留。

## 样式与尺寸

所有页面规则限定于 `.home-v2.home-workbench`，子类统一 `hw-*`。不复用旧 `.cover-copy`、`.home-dashboard`、`.route-ribbon` 等布局类，避开全局 390px 封面字号和旧高封面规则。字体和品牌颜色读取经理的 `--sans`、`--accent`、`--ink`、`--surface` 等全局 tokens；只有白色文本及照片遮罩使用中性色常量。

| 宽度 | 工作台卡片 | 六城路线 | 封面 |
| --- | --- | --- | --- |
| 375 / 390 / 430 | 待办整行，预算与准备并排 | 两列完整卡片 | 200px |
| 768 | 待办整行，预算与准备并排 | 三列 | 256px |
| 1024 | 待办、预算、准备三列 | 三列 | 256px |
| 1440 | 待办、预算、准备三列 | 六列 | 256px |

表格描述源码中的断点设计，实际排版尚待经理浏览器验证。所有链接式操作保持至少 44px 高度，六城卡片整体可点击，focus-visible 与 reduced-motion 均在首页范围内处理。

信息组织参考官方 [Wanderlog](https://wanderlog.com/) 的行程上下文、[TripIt](https://www.tripit.com/web/free) 的集中旅行入口和 [Airbnb 行程帮助页](https://www.airbnb.com/help/article/4192)。这里只取页面层级，不引入额外数据或功能。

## 已通过检查

全部命令均在唯一子仓库 `C:/Users/50415/OneDrive/文档/ChatGPT/Travel/travel-os-ui-redesign` 执行。

- `node scripts/home-workbench-test.mjs`：通过。通过 TypeScript 内存转译加载实际 HomeView、数据和现有格式／城市模型，使用 ReactDOMServer 真正渲染并捕获实际按钮 props，再调用其 onClick。覆盖全部 18 个所选日期、无效 99、`49/1/0/-17/-18/null` 阶段边界、3 类待办 target、无待办、6 个城市顺序与点击参数、预算与准备入口、非默认数值和零值。输入冻结，渲染前后比较全部 guideData，未产生导航副作用。Next Image 仅在测试中替换为 img，CSS 仅在测试中忽略。
- `pnpm exec oxlint views/home/HomeView.tsx scripts/home-workbench-test.mjs`：通过，exit 0。
- `pnpm exec tsc --noEmit --incremental false`：通过，exit 0，不生成增量检查文件。
- `node --experimental-strip-types scripts/trip-presentation-test.mjs`：通过，原 Fixed / To Book / Core / Flex 规则回归通过。

## 共用旧 guard 影响

`scripts/presentation-test.mjs` 的 Home guard 强制要求英文标题 `A Winter Journey Through Six Cities`。本轮按明确授权替换为中文“六城路线”，该旧断言需经理统一更新。本分工没有改共用测试，其余原 Home source guards（hero 常量、手机 source、六图路径、cities.map、nextAction、预算文案和点击 wiring）保留。

## 经理待实测

- 375 / 390 / 430 / 768 / 1024 / 1440 的无横向溢出、标题／预算数字换行、封面裁切、待办及预算／准备的首屏位置。
- 真实有／无 nextAction、最长期限／详情文案的自然换行，所选 Day 与当前计划入口保持一致；尤其 Day 17／18 城市继续采用原模型的广州／佛山，不解释成下一站。
- 六城点击进入原目标日期，预算／准备返回、手机 shell 衔接和 tab 键焦点。
- 浏览器中真实 mounted、TTFB、JS ready／transfer、LCP、hero loaded 性能标记。SSR 不执行 effect，当前测试只能验证标记 wiring。
- 经理统一 build、业务字段比对和最终提交。本分工未运行 build／audit、启动服务、操作浏览器／storage、部署或执行 git add／commit／push。

## 接续 P1 修复：导航后刷新丢失所选日期

经理生产构建 IAB 实测发现：Home 当前 Day 2 打开预算后，URL 缺少 `day`；页面加载并刷新，再回概览成为 Day 1。此次接续按明确追加范围只修改 `features/app/useAppController.ts` 的五处导航 URL 参数、新建 `scripts/navigation-context-test.mjs`，并追加本报告。没有进一步修改首页组件或样式。

原因是 Plan／Discover 的通用导航及 tab／城市选择写入 `day: null`，`openBudget` 最后的 replace 也删除 `day`。实际 `readUrlState()` 将缺少 day 解析为 0，新 mount 的 `applyUrl` 不接受 0，保留初始 selectedDay 1。

修复只涉及以下 URL 写入：

- `navigate`：Trip 继续使用传入 tripDay，其余视图统一保留 selectedDay。
- `selectPlanTab`、`selectDiscoverTab`、`selectDiscoverCity`：保留 selectedDay，并延续原 tab／city 参数。
- `openBudget`：最终 replace 写入 selectedDay；此前 navigate 生成的中间 push 记录也保留日期。

业务算法、Current Plan、storage／backup／queue、URL 解析代码和手机导航实现均未修改。

### 复现与检查

`node scripts/navigation-context-test.mjs` 在修复前对旧源码先失败于 URL day 为 0，随后改为优先验证全新实例刷新，明确复现 `Fresh reload must retain Day 2: 1 !== 2`。修复后完整测试通过，最终 exit 0。

该测试通过 TypeScript 内存转译，在独立 VM 执行实际 `useAppController`、`readUrlState`／`useUrlState`、storage hook、EditablePlan hook 和原模型代码；React hook 调度、window／history／定时器／DOM／localStorage／sessionStorage 均为测试私有内存 adapter。刷新使用最后 URL 创建全新 VM 和全新 hook 状态，不能继承旧 selectedDay。没有操作浏览器、宿主 globals、用户 storage 或应用 runtime。

覆盖 Day 2／15 的 Home → 预算 → 加载后刷新 → 返回 Home → 再刷新；通用 Home／Plan／Discover／More 导航、Trip 明确指定另一日、Plan tab、Discover tab／城市、准备与待办入口；检查真实 URL 和刷新后的 selectedDay／planTab／discoverTab／discoverCity／moreTab。还覆盖预算 push／replace 的两条历史记录、真实 popstate 后退，以及原手机五视图和 tab／城市选择。所有导航前后比较隔离业务 storage 与实际加载的源 JSON，均未变更。

以下最终检查均通过：

- `node scripts/navigation-context-test.mjs`
- `pnpm exec oxlint features/app/useAppController.ts scripts/navigation-context-test.mjs`
- `pnpm exec tsc --noEmit --incremental false`
- `node scripts/home-workbench-test.mjs`
- `node --experimental-strip-types scripts/mobile-shell-test.mjs`
- `node --experimental-strip-types scripts/linkage-test.mjs`

接续修复已停止写入。经理需统一重新构建，并在真实 IAB 复测 Day 2／15 的预算 URL、加载后刷新与返回 Home；同时复查 Discover tab／城市 URL 的刷新恢复。本分工没有运行 build／audit、Git 写操作、服务或浏览器。
