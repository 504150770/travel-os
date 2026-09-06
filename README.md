# 欧洲18天 · Personal Travel Guide

面向旅途中单手使用的个人旅行系统。路线固定为罗马 → 佛罗伦萨 → 威尼斯 → 维也纳 → 布拉格 → 巴黎，日期为 2026-12-01 至 2026-12-18。

## 本地运行

```bash
pnpm install
pnpm dev
```

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
- `data/hotels.json`：每城 4 家、四类噪音与睡眠风险
- `data/bookings.json`：机酒、铁路、票券、签证、保险、eSIM
- `data/budget.json`：¥26,000 硬预算与实际支出分类
- `data/checklist.json`：执行总控与真实职业状态签证材料
- `data/essentials.json`：途中速查
- `data/conflicts.json`：两份 PDF 与最新指令的冲突记录

修改价格、酒店、班次、票券或健身房只需更新 JSON；UI 自动读取。所有浏览器状态使用命名空间化 LocalStorage 保存。

## 构建链

项目参考开源 `personalized-travel-guide-skill` 的产品逻辑，将生产链固定为：

`research → structured data → render → audit → handoff`

`schemas/guide.schema.json` 定义结构；`scripts/audit.mjs` 检查缺失字段、交叉引用、图片文件、图片内容哈希去重、18天连续日期、15晚/5次换酒店、每城 4 家酒店、10 家健身房、Top 5、预算与状态枚举。结果写入 `audit/final-audit.json`，并更新 `.travel-build-state.json`。只有审计通过时 `handoff_allowed` 才为 `true`。
