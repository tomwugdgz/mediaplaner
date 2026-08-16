# mediaplaner · 户外社区媒体点位管理系统

> 面向户外社区媒体（**电梯框架** + **单元门智能框架**）的「选点 → 锁点 → 发布」全流程管理工具。
> 单文件 HTML 交付，双击即可运行，无需服务器、无需联网。

---
<img width="894" height="948" alt="微信图片_20260816193206_1289_66" src="https://github.com/user-attachments/assets/4f900bed-7dc1-4fad-9c23-639414e1546b" />

## 一句话介绍

把分散在多家供应商、多个城市的 **13,456** 个广告点位资源，与**客户**、**投放计划**在一个工具里打通，用状态机固化标准作业流程：

```
点位：可选 → 已选 → 已锁 → 已发布
计划：草稿 → 选点中 → 已选 → 已锁 → 已发布
```

---

## 快速开始

1. 双击 `点位管理系统.html`（用 Chrome / Edge 打开）。
2. 顶部四个视图：**总览 / 点位管理 / 客户管理 / 投放计划**。
3. 所有操作数据保存在**本机浏览器**，刷新不丢。

> 详细用法见 [`docs/用户说明.md`](docs/用户说明.md)。

---

## 文档导航

| 文档 | 内容 |
| --- | --- |
| [`docs/需求文档_PRD.md`](docs/需求文档_PRD.md) | 产品目标、用户故事、功能需求池、状态机、验收标准 |
| [`docs/软件开发说明书.md`](docs/软件开发说明书.md) | 系统架构、角色职责、完整业务流程、功能模块、数据模型 |
| [`docs/用户说明.md`](docs/用户说明.md) | 面向一线用户的操作手册与 FAQ |
| [`docs/调试文档.md`](docs/调试文档.md) | 构建链路、已知坑、jsdom 真跑验证、排错速查 |
| [`docs/数据层管理_db_sql.md`](docs/数据层管理_db_sql.md) | 以 SQLite(.db) + SQL 脚本为核心的数据管理方案 |

---

## 数据层（db + SQL）

- 主数据：**两份 SQLite 资源库**（`data/*.db`），由供应商 Excel 经清洗脚本生成。
- 管理手段：**SQL 脚本**（`data/schema.sql` 建库、`data/manage.sql` 查重/统计/更新）。
- 运行态：`data/points.json`（由 db 导出、构建内置）+ 浏览器 `localStorage` 覆盖层（仅状态变更）。

```bash
# 查看点位总数 / 按城市分布 / 重复分布
sqlite3 data/岚图汽车_资源数据库.db < data/manage.sql
```

> ⚠️ 资源库含真实楼盘地址与供应商信息，**仓库访问须受控**；对外演示优先用聚合统计，勿直接暴露明细。

---

## 二次开发（可选）

```bash
export PATH="<托管 Node 22>/bin:$PATH"
cd 点位管理系统源码目录
npm install
npm run build        # 产出 dist/index.html
node _pp.cjs         # 去 module 标记 → 单文件 点位管理系统.html
node _jsdom_test.cjs # 无头真跑回归（30 断言）
```

源码位于 `src/`（`App.jsx` / `store.js` / `components/`），构建配置见 `vite.config.js`。

---

## 目录结构

```
mediaplaner/
├── 点位管理系统.html          # 单文件可执行应用（生产构建）
├── README.md
├── LICENSE
├── docs/                      # 全部配套文档
├── data/                      # 主数据 + SQL（db + schema.sql + manage.sql + points.json）
└── src/                       # React 源码（可选，用于二次开发）
```

---

## 许可证

见 [`LICENSE`](LICENSE)。资源数据版权归各自供应商与运营方所有，仅限授权范围内使用。
