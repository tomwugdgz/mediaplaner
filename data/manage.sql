-- ============================================================
-- mediaplaner 资源库 日常管理 SQL 示例
-- 用法：sqlite3 岚图汽车_资源数据库.db < manage.sql
--       或 sqlite3 皓邻单元门智能框架_资源数据库.db < manage.sql
-- 说明：两库均含 t_resource / t_supplier。带 [电梯库专属] 的字段
--       仅电梯框架库有；带 [单元门库专属] 的仅单元门库有。
-- ============================================================

-- 0) 切换数据库（在命令行执行，这里仅作提示）
--    .open 岚图汽车_资源数据库.db

-- 1) 点位总数
SELECT COUNT(*) AS total_points FROM t_resource;

-- 2) 按城市统计（两库均有 city 字段）
SELECT city, COUNT(*) AS cnt
FROM t_resource
GROUP BY city
ORDER BY cnt DESC;

-- 3) 重复状态分布
SELECT dup_status, COUNT(*) AS cnt
FROM t_resource
GROUP BY dup_status;

-- 4) 跨来源重复楼盘清单（同盘多供应商，需确认归属）
SELECT dup_group, project, city, GROUP_CONCAT(supplier) AS suppliers, COUNT(*) AS n
FROM t_resource
WHERE dup_status = '跨来源重复'
GROUP BY dup_group
ORDER BY n DESC, city;

-- 5) 高价值楼盘（级别 A+ 以上，按媒体位总数排序）[电梯库专属: level/total_media]
SELECT project, city, level, total_media
FROM t_resource
WHERE level IN ('A+', 'A++')
ORDER BY CAST(total_media AS INTEGER) DESC
LIMIT 50;

-- 5b) 单元门库高价值楼盘 [单元门库专属: community_type/total_media]
-- SELECT project, city, community_type, total_media
-- FROM t_resource
-- WHERE CAST(total_media AS INTEGER) >= 5
-- ORDER BY CAST(total_media AS INTEGER) DESC
-- LIMIT 50;

-- 6) 供应商点位覆盖（谁家盘多）
SELECT supplier, COUNT(*) AS cnt
FROM t_resource
GROUP BY supplier
ORDER BY cnt DESC;

-- 7) 关键字检索楼盘（名称或地址）
SELECT id, supplier, city, project, address
FROM t_resource
WHERE project LIKE '%万科%' OR address LIKE '%天河%'
LIMIT 100;

-- 8) 行业限制筛查（避免违规投放）
SELECT project, city, restriction
FROM t_resource
WHERE restriction IS NOT NULL AND restriction <> '' AND restriction <> '没有限制'
LIMIT 100;

-- 9) 批量补充供应商联系人（维护 t_supplier）
UPDATE t_supplier
SET contact = '待补充', phone = '待补充'
WHERE supplier = '群忠传媒';

-- 10) 导出指定城市明细到 CSV（命令行）
--     .headers on
--     .mode csv
--     .output guangzhou.csv
--     SELECT * FROM t_resource WHERE city='广州';
--     .output stdout

-- 11) 校验：前端 points.json 条数应与以下一致
--     电梯框架库 COUNT = 5280；单元门库 COUNT = 8176；合计 13456。
SELECT 'elevator_or_unitdoor' AS lib, COUNT(*) AS rows FROM t_resource;
