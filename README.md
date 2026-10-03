# Jacob Travel · 欧洲18天 Personal Travel Guide

面向旅途中单手使用的个人旅行系统。路线固定为罗马 → 佛罗伦萨 → 威尼斯 → 维也纳 → 布拉格 → 巴黎，日期为 2026-12-01 至 2026-12-18。

## 接续开发与验收

新对话先读 [HANDOFF.md](HANDOFF.md)，再读 [QA 进度与证据](artifacts/visual-qa-20261001/qa-progress.json)，不要从零重做已获认可的页面。

- 唯一工作目录：`C:/Users/50415/OneDrive/文档/ChatGPT/Travel/travel-os-ui-redesign`；不要操作父目录下的其他项目。
- GitHub：`504150770/travel-os`；接续分支：`codex/visual-qa-20260929`。
- 当前重点是已有功能的真实交互与视觉验收；整体 QA **尚未完成**。构建/结构审计通过不等于全部功能或用户视觉验收通过。
- 最新手机离线页修复已备份并获 ChatGPT High 局部认可；尚未部署。线上保留此前用户授权的城市入口版本，不能把分支 HEAD 当线上版本。
- 保持旅行事实、Current Plan、酒店、国际航班、住宿日期、预算、签证及推荐算法不变。发布需新一轮明确授权。

## 本地运行

```bash
pnpm install
pnpm dev --port 3000
```

若 `localhost:3000` 已有本项目服务，直接复用；先确认进程和目录，不抢占或终止未知服务。状态修改类 QA 使用独立测试 origin，并先通过界面导出、确认可撤销；私人导出不上传 GitHub 或 ChatGPT。

生产检查：

```bash
pnpm check
```

## 数据层

- `data/trip.json`：全局日期、城市、晚数和事实优先级
- `data/days.json`：Day 1–18、时间轴、Mini Route、拍摄、止损与可选 GYM
- `data/places.json`：地点、地图查询与已核对坐标
- `data/options.json`：每城 4 个可替换景点/街区选择，不改变主行程
- `data/images.json`：全局唯一视觉资产、用途、时间与来源
- `data/gyms.json`：10 家训练候选与 Most Photogenic Top 5
- `data/restaurants.json`：64 家按已订酒店与当天路线排序的餐厅、咖啡馆及回酒店低折腾选项
- `data/shopping.json`：31 个按已订酒店与当天路线组织的购物候选
- `data/xhs.json`：城市、拍摄、餐饮、GYM、购物与避坑搜索入口
- `data/hotel-bookings.json`：6 份真实入住凭证，是当前住宿的唯一事实源
- `data/transport-recommendations.json`：7 段门到门交通与三档候选槽；动态班次、总价和 23kg 行李未核实时保持 `UNVERIFIED`
- `data/day-routes.json`：18 天酒店出发/回程、48 段真实路网距离与 Today at a Glance
- `data/transit-day-execution.json`：6 个跨城日的退房、拖箱、候车/值机、抵达与延误止损卡
- `data/deadlines.json`：酒店取消、签证、交通、门票、在线入住和航班值机截止节点
- `data/survival.json`：按已订酒店锚定的 6 城应急与生活速查
- `data/day-plans.json`：可编辑 Current Trip，只保存 Entity 引用、时间和状态
- `data/activities.json`：原时间轴中非景点活动的 Entity 数据
- `data/quick-picks.json`：按城市引用 Entity 的快速选择
- `data/bookings.json`：机酒、铁路、票券、签证、保险、eSIM 的唯一订单状态
- `data/tasks.json`：总控任务；已关联订单会随 Booking 状态自动完成
- `data/budget.json`：¥26,000 硬预算与实际支出分类
- `data/checklist.json`：执行总控与真实职业状态签证材料
- `data/essentials.json`：途中速查
- `data/conflicts.json`：两份 PDF 与最新指令的冲突记录

UI 从上述数据层读取；价格、班次、票券、酒店等事实只有在用户授权并核实时才能更新。正式计划引用与基础 Entity 分离，浏览器也可能有现有本地覆盖，不能只看默认 JSON 就推断用户当前状态。普通状态使用命名空间化 LocalStorage，部分离线资料使用 IndexedDB。

## 构建链

项目参考开源 `personalized-travel-guide-skill` 的产品逻辑，将生产链固定为：

`research → structured data → render → audit → handoff`

`schemas/guide.schema.json` 定义结构；`scripts/audit.mjs` 检查缺失字段、交叉引用、全部行程点配图、图片内容与感知哈希去重、18天连续日期、15晚/5次换酒店、酒店噪音维度与房型图证据、餐饮来源、Booking/Task联动、预算和外链。结果写入 `audit/final-audit.json`，并更新 `.travel-build-state.json`。只有审计通过时 `handoff_allowed` 才为 `true`。

浏览器中的订单、任务、实际支出、收藏、在线入住、截止节点、备注和订单补充信息可在 `MORE → BACKUP` 导出为 JSON，并在另一台设备中恢复。

恢复代码/模型检查已通过，但实际浏览器 Restore E2E 仍受文件访问权限阻断，尚不能宣称真实恢复已验收。完整回归、浏览器限制、截图与审核范围见 [交接文档](HANDOFF.md)。
