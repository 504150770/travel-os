# Desktop Trip UI review · 2026-10-13

分工 C 已完成源码调整，停止写入，等待经理统一浏览器验证、构建、字段比对和提交。

## 修改范围与结果

- `views/trip/DesktopTripWorkspace.tsx`：工具栏与地图图层使用中文短标签；按钮提供视图 pressed 和行程 expanded 状态。工具栏允许外层、工具组换行，主布局首行改为自适应高度。
- 768–899px compact 初始只显示概览。点击“行程”后显示全宽自然布局时间线，概览内容容器设为 hidden；时间线有“返回概览”或“返回地图”按钮。compact 状态独立于宽桌面面板折叠状态，切换视图会关闭 compact 行程。移除默认绝对定位 420px 时间线，因此不会覆盖概览。
- 宽桌面保留 340–560px 可调整行程面板、420px 默认值、持久宽度和双击重置。收起后仍可通过工具栏“行程”展开。
- prev/next 使用 guideData 首末日边界，并在真实 changeDay handler 内检查有效日期编号；切日仍清空 selectedPoint、selectedLeg、candidates。日选择弹窗选日后将焦点返回日期按钮；原有 Escape/outside-focus 清理保持。
- `DesktopTripOverview.tsx`：把已有图片改为较短的图文上下文卡，标题 22–24px；首项安排和当日住宿提前显示，沿用已有详情、图库与导航动作。活动类型首项只显示详情，不把活动名称作为新的导航入口。景点、推荐、住宿使用白色轻边框卡片和 14px 说明文字。所有图片仍使用原有来源，包括已有巴黎 panorama。
- `DesktopTripTimeline.tsx`：中文空态；选中按钮提供 pressed 语义；每次切日将时间线滚动归位。保留时间编辑、DnD、上下移和导航原动作。
- `desktop-workspace.css`：从全局 sans/canvas/ink/accent/line tokens 取主题；减少独立蓝色和活动插图彩色装饰。工作区高度、loading 高度和 drawer backdrop 顶部对齐 72px DesktopShell。地图图层工具定位到 map-stage 内，距其顶部 64px并可换行，避免依赖可变工具栏高度。
- 新增 `scripts/desktop-workbench-test.mjs`，没有修改 package.json 或其他测试脚本。

未修改 DesktopTripMap/Drawers/hooks/data/private/依赖/算法；未 Git add/commit/push、build/audit、启动服务、操作浏览器或真实 storage。原有其他人的脏文件未处理。

## 验证

以下检查 exit 0：

- `node scripts/desktop-workbench-test.mjs`
- `node --experimental-strip-types scripts/desktop-workspace-test.mjs`
- `node --experimental-strip-types scripts/trip-presentation-test.mjs`
- `node --experimental-strip-types scripts/desktop-practical-boundary-test.mjs`
- `pnpm exec oxlint views/trip/DesktopTripWorkspace.tsx views/trip/DesktopTripOverview.tsx views/trip/DesktopTripTimeline.tsx scripts/desktop-workbench-test.mjs`
- `pnpm exec tsc --noEmit --incremental false`（不生成 tsbuildinfo）
- 指定四个源文件的 `git diff --check`

新测试 transpile 并执行真实 DesktopTripWorkspace 与 useTripController，采用有状态 React hook adapter 重渲染，使用真实 mapSelectors。覆盖 compact 默认视图、开合与返回、视图切换、直接调用首末日 disabled handler 的边界、切日清空选择/候选、候选去重与真实 addEntity 参数、fit/layer 操作、drawer/entity/gym/QuickAdd 地图互动条件、wide imperative collapse/expand、宽度 clamp/持久值/reset。浏览器 API、无关子组件与已被现有测试覆盖的展示派生被隔离；localStorage 为 VM 内存 Map，未访问真实 storage。

mapOpened 初始 false、显式 showMap、隐藏地图 wrapper、lazy DesktopTripMap 引用和 interactive gate 保留。测试确认首次概览无地图节点，打开后切回概览和 compact 行程仍存在同 type/key 的地图 JSX；这不等同于真实 Leaflet 实例验证。

## 待经理实测与静态 guard

- 重点 820×900（经理已复现旧覆盖问题）、768/899、900/1024/1100、宽桌面 1440：compact 概览完整宽度、所有工具标签可达且无横向溢出；展开行程后返回可见；900–1100 工具栏换行后的内容高度和地图工具位置。
- 日期弹窗 Escape、外部点击/焦点、选日后回焦点；上一天/下一天边界和时间线切日归位。
- 1024/820 初始概览实际无地图网络/Leaflet 挂载；首次显式打开、地图→概览→地图、compact 行程往返的真实实例复用；drawer/gym/QuickAdd 打开时地图实际不可交互。
- 宽桌面 resize、double-click reset、collapsed 后工具栏再展开；日 1/5/8/15/18 的首项、住宿、长摘要与图库动作。
- `scripts/presentation-test.mjs:91` 的旧 `aria-label="Workspace view"` 静态断言需经理更新为中文 `行程视图`，或改为语义断言。本分工不修改该脚本。其余全局/壳/首页外观 guard 由对应分工与经理处理；未以删除测试绕过旧 guard。

参考信息层级：[Wanderlog 行程与地图](https://wanderlog.com/)、[TripIt 聚合行程](https://www.tripit.com/web/free)、[Airbnb 行程上下文](https://www.airbnb.com/help/article/4192)。只借鉴信息顺序，未新增这些产品功能。
