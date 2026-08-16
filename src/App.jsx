import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  mergePoints,
  loadOverrides,
  saveOverrides,
  loadCustomers,
  saveCustomers,
  loadPlans,
  savePlans,
  genId,
} from './store.js';
import Dashboard from './components/Dashboard.jsx';
import PointManage from './components/PointManage.jsx';
import CustomerManage from './components/CustomerManage.jsx';
import PlanManage from './components/PlanManage.jsx';

const TABS = [
  { key: 'dashboard', label: '总览' },
  { key: 'points', label: '点位管理' },
  { key: 'customers', label: '客户管理' },
  { key: 'plans', label: '投放计划' },
];

/**
 * App —— 根组件。持有全局状态（点位覆盖层 / 客户 / 计划），
 * 负责 localStorage 持久化，并分发到各业务模块。
 */
export default function App() {
  // ===== 状态（惰性初始化，从 localStorage 读取） =====
  const [overrides, setOverrides] = useState(() => loadOverrides());
  const [customers, setCustomers] = useState(() => loadCustomers());
  const [plans, setPlans] = useState(() => loadPlans());
  const [tab, setTab] = useState('dashboard');

  // ===== 持久化 =====
  useEffect(() => saveOverrides(overrides), [overrides]);
  useEffect(() => saveCustomers(customers), [customers]);
  useEffect(() => savePlans(plans), [plans]);

  // 合并覆盖层后的可用点位数组。
  const points = useMemo(() => mergePoints(overrides), [overrides]);

  // ===== 点位覆盖层更新 =====
  const setOverride = useCallback((id, patch) => {
    setOverrides((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), ...patch } }));
  }, []);

  // ===== 客户 CRUD =====
  const addCustomer = useCallback((data) => {
    setCustomers((prev) => [...prev, { ...data, id: genId('cust') }]);
  }, []);
  const updateCustomer = useCallback((data) => {
    setCustomers((prev) => prev.map((c) => (c.id === data.id ? { ...c, ...data } : c)));
  }, []);
  const deleteCustomer = useCallback((id) => {
    setCustomers((prev) => prev.filter((c) => c.id !== id));
  }, []);

  // ===== 计划 CRUD 与状态机 =====
  const createPlan = useCallback((data) => {
    setPlans((prev) => [
      ...prev,
      {
        ...data,
        id: genId('plan'),
        status: '草稿',
        pointIds: [],
        createdAt: nowStr(),
        publishedAt: null,
      },
    ]);
  }, []);

  const updatePlan = useCallback((data) => {
    setPlans((prev) => prev.map((p) => (p.id === data.id ? { ...p, ...data } : p)));
  }, []);

  const deletePlan = useCallback(
    (id) => {
      // 先取出待删除计划的选点，重置其点位状态。
      const plan = plans.find((p) => p.id === id);
      if (plan && plan.pointIds?.length) {
        const ids = new Set(plan.pointIds);
        setOverrides((prev) => {
          const next = { ...prev };
          ids.forEach((pid) => {
            next[pid] = {
              status: '可选',
              planId: null,
              customer: null,
              lockedAt: null,
              publishedAt: null,
            };
          });
          return next;
        });
      }
      setPlans((prev) => prev.filter((p) => p.id !== id));
    },
    [plans]
  );

  // 选点：将点位加入计划，点位状态置「已选」。
  const addPointsToPlan = useCallback(
    (planId, pointIds) => {
      const plan = plans.find((p) => p.id === planId);
      if (!plan) return;
      if (plan.status === '已锁' || plan.status === '已发布') {
        alert('该计划已锁位或已发布，无法继续选点');
        return;
      }
      const union = Array.from(new Set([...(plan.pointIds || []), ...pointIds]));
      const idSet = new Set(pointIds);
      setOverrides((prev) => {
        const next = { ...prev };
        pointIds.forEach((pid) => {
          next[pid] = {
            ...(next[pid] || {}),
            status: '已选',
            planId: planId,
            customer: plan.customerName,
          };
        });
        return next;
      });
      setPlans((prev) =>
        prev.map((p) =>
          p.id === planId
            ? { ...p, pointIds: union, status: p.status === '草稿' ? '选点中' : p.status }
            : p
        )
      );
      // 若计划处于选点中/草稿，选点后推进为「已选」。
      setPlans((prev) =>
        prev.map((p) => (p.id === planId && (p.status === '选点中' || p.status === '草稿') ? { ...p, status: '已选' } : p))
      );
      void idSet;
    },
    [plans]
  );

  // 从计划移除点位，点位回到「可选」。
  const removePointsFromPlan = useCallback(
    (planId, pointIds) => {
      const idSet = new Set(pointIds);
      setOverrides((prev) => {
        const next = { ...prev };
        pointIds.forEach((pid) => {
          next[pid] = {
            status: '可选',
            planId: null,
            customer: null,
            lockedAt: null,
            publishedAt: null,
          };
        });
        return next;
      });
      setPlans((prev) =>
        prev.map((p) => {
          if (p.id !== planId) return p;
          const remaining = (p.pointIds || []).filter((x) => !idSet.has(x));
          const status = remaining.length === 0 && p.status === '已选' ? '选点中' : p.status;
          return { ...p, pointIds: remaining, status };
        })
      );
    },
    []
  );

  // 锁点：计划内点位置「已锁」，计划状态→已锁。
  const lockPlan = useCallback(
    (planId) => {
      const plan = plans.find((p) => p.id === planId);
      if (!plan || plan.pointIds.length === 0) return;
      const ts = nowStr();
      const idSet = new Set(plan.pointIds);
      setOverrides((prev) => {
        const next = { ...prev };
        plan.pointIds.forEach((pid) => {
          next[pid] = { ...(next[pid] || {}), status: '已锁', lockedAt: ts };
        });
        return next;
      });
      setPlans((prev) => prev.map((p) => (p.id === planId ? { ...p, status: '已锁' } : p)));
      void idSet;
    },
    [plans]
  );

  // 发布/上画：点位置「已发布」，计划状态→已发布，返回更新后的计划用于通知书。
  const publishPlan = useCallback(
    (planId) => {
      const plan = plans.find((p) => p.id === planId);
      if (!plan || plan.status !== '已锁') return plan;
      const ts = nowStr();
      const idSet = new Set(plan.pointIds);
      setOverrides((prev) => {
        const next = { ...prev };
        plan.pointIds.forEach((pid) => {
          next[pid] = { ...(next[pid] || {}), status: '已发布', publishedAt: ts };
        });
        return next;
      });
      const updated = { ...plan, status: '已发布', publishedAt: ts };
      setPlans((prev) => prev.map((p) => (p.id === planId ? updated : p)));
      void idSet;
      return updated;
    },
    [plans]
  );

  // ===== 渲染 =====
  return (
    <div className="min-h-full">
      {/* 顶栏 */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-3">
          <div>
            <h1 className="text-lg font-bold text-slate-800">点位管理系统</h1>
            <p className="text-xs text-slate-400">户外社区媒体 · 选点 → 锁点 → 发布 工作流</p>
          </div>
          <div className="text-xs text-slate-400">
            数据内置 {points.length.toLocaleString()} 条 · 本地持久化
          </div>
        </div>
        {/* Tab 导航 */}
        <nav className="mx-auto flex max-w-[1400px] gap-1 px-6">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`border-b-2 px-4 py-2 text-sm font-medium transition ${
                tab === t.key
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      {/* 内容区 */}
      <main className="mx-auto max-w-[1400px] px-6 py-6">
        {tab === 'dashboard' && (
          <Dashboard points={points} customers={customers} plans={plans} />
        )}
        {tab === 'points' && (
          <PointManage
            points={points}
            setOverride={setOverride}
            plans={plans}
            addPointsToPlan={addPointsToPlan}
          />
        )}
        {tab === 'customers' && (
          <CustomerManage
            customers={customers}
            addCustomer={addCustomer}
            updateCustomer={updateCustomer}
            deleteCustomer={deleteCustomer}
          />
        )}
        {tab === 'plans' && (
          <PlanManage
            plans={plans}
            customers={customers}
            points={points}
            createPlan={createPlan}
            updatePlan={updatePlan}
            deletePlan={deletePlan}
            addPointsToPlan={addPointsToPlan}
            removePointsFromPlan={removePointsFromPlan}
            lockPlan={lockPlan}
            publishPlan={publishPlan}
          />
        )}
      </main>
    </div>
  );
}

/** 生成可读时间戳（YYYY-MM-DD HH:mm:ss）。 */
function nowStr() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(
    d.getMinutes()
  )}:${p(d.getSeconds())}`;
}
