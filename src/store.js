import rawPoints from './data/points.json';

/**
 * store.js —— 数据层与本地持久化封装。
 *
 * 设计要点：
 * 1. 13,456 条基础点位数据通过 import 直接打包进应用（不运行时 fetch）。
 * 2. 点位的状态变更（status/planId/customer/lockedAt/publishedAt/note）只保存
 *    “覆盖层(overrides)”到 localStorage，而非整张表，避免超出 5MB 配额。
 *    运行时通过 mergePoints 将覆盖层叠加到基础数据上。
 * 3. 客户、投放计划整体保存到 localStorage。刷新不丢。
 */

// ===== 基础常量 / 枚举 =====
export const POINT_STATUSES = ['可选', '已选', '已锁', '已发布'];
export const MEDIA_TYPES = ['电梯框架', '单元门智能框架'];
export const DUP_STATUS = ['独占', '跨来源重复', '来源内重复'];
export const AUTH_STATUS = ['未授权', '审批中', '已授权'];
export const CUSTOMER_CATEGORY = ['A', 'B', 'C'];
export const PLAN_STATUS = ['草稿', '选点中', '已选', '已锁', '已发布'];

// 基础点位只读数据（打包内置）。
export const BASE_POINTS = rawPoints;

// localStorage 键名（带版本号，便于后续兼容）。
const KEYS = {
  overrides: 'pdgl_point_overrides_v1',
  customers: 'pdgl_customers_v1',
  plans: 'pdgl_plans_v1',
};

/**
 * 从 localStorage 读取 JSON，失败或为空时返回 fallback。
 * @param {string} key 存储键
 * @param {*} fallback 默认值
 * @return {*}
 */
export function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (err) {
    console.warn('[store] 读取本地存储失败:', key, err);
    return fallback;
  }
}

/**
 * 将值写入 localStorage（序列化）。
 * @param {string} key 存储键
 * @param {*} value 任意可序列化对象
 */
export function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn('[store] 写入本地存储失败:', key, err);
  }
}

/** 读取点位覆盖层（id -> 部分字段）。 */
export function loadOverrides() {
  return readJSON(KEYS.overrides, {});
}

/** 保存点位覆盖层。 */
export function saveOverrides(overrides) {
  writeJSON(KEYS.overrides, overrides);
}

/** 读取客户列表。 */
export function loadCustomers() {
  return readJSON(KEYS.customers, []);
}

/** 保存客户列表。 */
export function saveCustomers(customers) {
  writeJSON(KEYS.customers, customers);
}

/** 读取投放计划列表。 */
export function loadPlans() {
  return readJSON(KEYS.plans, []);
}

/** 保存投放计划列表。 */
export function savePlans(plans) {
  writeJSON(KEYS.plans, plans);
}

/**
 * 生成唯一 ID（时间戳 + 随机串）。
 * @param {string} prefix 前缀
 * @return {string}
 */
export function genId(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}

/**
 * 将覆盖层叠加到基础点位数据上，得到可用点位数组。
 * 仅对发生过变更的点位进行合并，未变更的点位保持基础值。
 * @param {Object} overrides 覆盖层
 * @return {Array<Object>}
 */
export function mergePoints(overrides) {
  const ov = overrides || {};
  return BASE_POINTS.map((p) => {
    const patch = ov[p.id];
    if (!patch) return p;
    return { ...p, ...patch };
  });
}

/**
 * 安全解析数字字段（数据中有字符串/空值）。
 * @param {*} v 原始值
 * @param {number} fallback 默认值
 * @return {number}
 */
export function toNumber(v, fallback = 0) {
  if (v === null || v === undefined || v === '') return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
