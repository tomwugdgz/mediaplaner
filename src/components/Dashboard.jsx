import React, { useMemo } from 'react';
import { POINT_STATUSES, MEDIA_TYPES } from '../store.js';
import Badge from './Badge.jsx';

/**
 * Dashboard —— 总览页。
 * 展示核心 KPI 与分布（纯 CSS 条形图，不引图表库）。
 * @param {Object} props
 * @param {Array<Object>} props.points 合并后的点位数组
 * @param {Array<Object>} props.customers 客户列表
 * @param {Array<Object>} props.plans 投放计划列表
 */
export default function Dashboard({ points, customers, plans }) {
  const stats = useMemo(() => {
    const total = points.length;
    const byStatus = {};
    POINT_STATUSES.forEach((s) => (byStatus[s] = 0));
    const byMedia = {};
    MEDIA_TYPES.forEach((m) => (byMedia[m] = 0));
    const cities = new Set();

    points.forEach((p) => {
      byStatus[p.status] = (byStatus[p.status] || 0) + 1;
      byMedia[p.mediaType] = (byMedia[p.mediaType] || 0) + 1;
      if (p.city) cities.add(p.city);
    });

    const authorized = customers.filter((c) => c.authStatus === '已授权').length;
    const activePlans = plans.filter((pl) => pl.status !== '已发布').length;

    return {
      total,
      byStatus,
      byMedia,
      cityCount: cities.size,
      customerCount: customers.length,
      authorized,
      activePlans,
    };
  }, [points, customers, plans]);

  return (
    <div className="space-y-6">
      {/* KPI 卡片 */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="点位总数" value={stats.total} accent="brand" />
        <KpiCard label="覆盖城市" value={stats.cityCount} accent="indigo" />
        <KpiCard label="客户总数" value={stats.customerCount} accent="blue" />
        <KpiCard label="已授权客户" value={stats.authorized} accent="green" />
        <KpiCard label="进行中计划" value={stats.activePlans} accent="orange" />
        <KpiCard label="已完成发布" value={plans.length - stats.activePlans} accent="gray" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 点位状态分布 */}
        <Section title="点位状态分布">
          <BarChart
            data={POINT_STATUSES.map((s) => ({ label: s, value: stats.byStatus[s] || 0 }))}
            total={stats.total}
            colors={{ 可选: 'bg-slate-400', 已选: 'bg-blue-500', 已锁: 'bg-indigo-500', 已发布: 'bg-green-500' }}
          />
        </Section>

        {/* 媒体类型分布 */}
        <Section title="媒体类型分布">
          <BarChart
            data={MEDIA_TYPES.map((m) => ({ label: m, value: stats.byMedia[m] || 0 }))}
            total={stats.total}
            colors={{ 电梯框架: 'bg-sky-500', 单元门智能框架: 'bg-teal-500' }}
          />
        </Section>
      </div>

      {/* 客户与计划概览 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Section title="客户授权概览">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="mb-1 flex justify-between text-sm text-slate-600">
                <span>已授权</span>
                <span>
                  {stats.authorized} / {stats.customerCount}
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-green-500"
                  style={{
                    width:
                      stats.customerCount > 0
                        ? `${(stats.authorized / stats.customerCount) * 100}%`
                        : '0%',
                  }}
                />
              </div>
            </div>
            <Badge color="green">授权率 {stats.customerCount > 0 ? Math.round((stats.authorized / stats.customerCount) * 100) : 0}%</Badge>
          </div>
        </Section>

        <Section title="计划进度概览">
          <PlanStatusSummary plans={plans} />
        </Section>
      </div>
    </div>
  );
}

/** 单个 KPI 卡片。 */
function KpiCard({ label, value, accent }) {
  const accents = {
    brand: 'text-brand-600',
    indigo: 'text-indigo-600',
    blue: 'text-blue-600',
    green: 'text-green-600',
    orange: 'text-orange-600',
    gray: 'text-slate-600',
  };
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-sm text-slate-500">{label}</div>
      <div className={`mt-1 text-3xl font-bold ${accents[accent] || accents.gray}`}>{value}</div>
    </div>
  );
}

/** 区块容器。 */
function Section({ title, children }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold text-slate-700">{title}</h3>
      {children}
    </div>
  );
}

/** CSS 横向条形图。 */
function BarChart({ data, total, colors }) {
  return (
    <div className="space-y-3">
      {data.map((d) => {
        const pct = total > 0 ? (d.value / total) * 100 : 0;
        return (
          <div key={d.label}>
            <div className="mb-1 flex justify-between text-sm text-slate-600">
              <span>{d.label}</span>
              <span>
                {d.value}（{Math.round(pct)}%）
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${colors[d.label] || 'bg-slate-400'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** 计划状态汇总条。 */
function PlanStatusSummary({ plans }) {
  const order = ['草稿', '选点中', '已选', '已锁', '已发布'];
  const counts = {};
  order.forEach((s) => (counts[s] = 0));
  plans.forEach((p) => (counts[p.status] = (counts[p.status] || 0) + 1));
  const colorMap = {
    草稿: 'bg-slate-400',
    选点中: 'bg-yellow-400',
    已选: 'bg-blue-500',
    已锁: 'bg-indigo-500',
    已发布: 'bg-green-500',
  };
  return (
    <div className="flex flex-wrap gap-2">
      {order.map((s) => (
        <div
          key={s}
          className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2"
        >
          <span className={`h-3 w-3 rounded-full ${colorMap[s]}`} />
          <span className="text-sm text-slate-600">{s}</span>
          <span className="text-sm font-semibold text-slate-800">{counts[s]}</span>
        </div>
      ))}
      {plans.length === 0 && <div className="text-sm text-slate-400">暂无计划</div>}
    </div>
  );
}
