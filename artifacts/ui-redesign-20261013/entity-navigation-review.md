# 活动目的地导航修复

经理真实浏览器验收发现：末日“广州入境与取行李”详情仍提供活动名称的地图搜索；桌面时间线和探索也把休息、排队、跨国航班等活动当作单一地点。这里记录源码和模型验收，修复后的实际页面由经理统一新构建复测。

## 修改范围

- 新增 `features/trip/entityNavigation.ts`，只为 UI 判断是否存在导航目的地。
- `components/mobile/MobileEntitySheet.tsx`、`components/mobile/MobilePlanItemSheet.tsx`、`views/trip/DesktopTripTimeline.tsx`、`views/trip/CurrentPlan.tsx` 接入导航目的地判断。
- `views/shared/EntityUi.tsx` 的导航、Apple Maps、从酒店出发，以及 `views/discover/DiscoverView.tsx` 的详情地图/酒店链接与酒店路线提示，使用同一判断。
- 新增 `scripts/entity-navigation-test.mjs`。没有修改旧回归脚本。

普通地点、自定义地点、餐饮、酒店、购物等实体的 Google/Apple/酒店路线链接保持原值。活动只接受有限范围内的有效坐标，或已有的单地点地址；空值、待确认/未知等占位、活动名称本身、箭头连接的多路段地址不再导航。活动的 `mapQuery` 是事项名称，不能作为地点证据。有明确目的地的活动使用该坐标或地址生成链接，酒店路线保留已有 origin 和 travelmode，仅替换 destination。无可用目的地时仍保留活动详情、加入、移序与图库。

不修改原 `mapLinks`、实体库、旅行事实、数据、推荐、计划存储、酒店选择、地图引擎或 Today 主活动的“查看安排”。这是 UI 目的地门禁，没有地理编码或新增旅行位置。

## 验证

新测试在修复前实际运行失败：Day 18 无地点活动仍有一个地图链接，预期为零。修复后执行实际 helper、mapLinks、图库 helper，以及六个组件模块的 JSX/handler 通过，覆盖：

- Day 18 实际活动行、未知地址/活动名称/多路段地址/无效坐标均不提供导航。
- 有效坐标或明确单地点地址活动可导航，坐标优先；普通八类实体的地图与酒店链接严格等于原值。
- Google/Apple/酒店目的地一致，普通酒店 URL 完整保持，活动酒店 origin/travelmode 保持。
- 手机目标日、精确备选 `itemId` 提升、详情关闭与图库；桌面时间修改、移序、拖动 reorder、换日、备选/移除回调保持。
- 共享探索选日和加入/提升保持；无地点活动不再显示“点击从酒店出发”的矛盾提示。

定向 `oxlint`、`tsc --noEmit --incremental false`、`git diff --check` 通过；相关旧测试 `explore-promotion`、`desktop-workbench`、`desktop-workspace`、`trip-presentation`、`mobile-practical-boundary`、`presentation` 全部通过。没有运行构建、项目审计或服务，没有修改 Git，没有操纵浏览器或真实业务数据。

这里的模型验证不替代真实浏览器链接、布局或焦点实测；经理随后统一新构建复测、全量检查和提交。
