-- ============================================================
-- mediaplaner 资源库 DDL（由实际 .db 导出，可一键重建空库）
-- 说明：两个 .db 各自独立，均含 t_resource + t_supplier；
--       电梯框架库与单元门库 t_resource 字段略有差异（见下）。
-- ============================================================

-- ===================== 电梯框架库（岚图汽车_资源数据库.db） =====================
-- ---- 表 t_resource ----
CREATE TABLE t_resource (
    id INTEGER PRIMARY KEY, supplier TEXT, contact TEXT, phone TEXT,
    dup_status TEXT, dup_group TEXT, city TEXT, area TEXT, block TEXT,
    project TEXT, address TEXT, category TEXT, level TEXT, price TEXT,
    built TEXT, households TEXT, population TEXT, occupancy TEXT,
    floors TEXT, buildings TEXT, units TEXT, elevators TEXT,
    in_elev_media TEXT, hall_media TEXT, total_media TEXT,
    ad_size TEXT, restriction TEXT, audience TEXT, note TEXT,
    src_file TEXT, src_sheet TEXT, src_no TEXT);

-- ---- 表 t_supplier ----
CREATE TABLE t_supplier (
    supplier TEXT PRIMARY KEY, src_file TEXT, contact TEXT, phone TEXT, remark TEXT);

-- ===================== 单元门智能框架库（皓邻单元门智能框架_资源数据库.db） =====================
-- ---- 表 t_resource ----
CREATE TABLE t_resource (
    id INTEGER PRIMARY KEY, supplier TEXT, contact TEXT, phone TEXT,
    dup_status TEXT, dup_group TEXT, province TEXT, city TEXT, area TEXT,
    project TEXT, address TEXT, community_type TEXT, buildings TEXT,
    unit_doors TEXT, price TEXT, households TEXT, movein_year TEXT,
    total_media TEXT, src_sheet TEXT, note TEXT);

-- ---- 表 t_supplier ----
CREATE TABLE t_supplier (
    supplier TEXT PRIMARY KEY, src_file TEXT, contact TEXT, phone TEXT, remark TEXT);
