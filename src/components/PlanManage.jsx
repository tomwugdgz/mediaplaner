import React, { useState, useMemo, useEffect } from 'react';
import Modal from './Modal.jsx';
import Badge from './Badge.jsx';
import { PLAN_STATUS, POINT_STATUSES, MEDIA_TYPES } from '../store.js';

const EMPTY_PLAN = {
  customerId: '',
  planName: '',
  city: '',
  weeks: 1,
  weeklyQty: 0,
  unitPrice: 0,
};

/**
 * PlanManage —— 投放计划与「选点→锁点→发布」工作流。
 * @param {Object} props
 * @param {Array<Object>} props.plans 计划列表
 * @param {Array<Object>} props.customers 客户列表
 * @param {Array<Object>} props.points 合并点位数组
 * @param {Function} props.createPlan
 * @param {Function} props.updatePlan
 * @param {Function} props.deletePlan
 * @param {Function} props.addPointsToPlan (planId, pointIds)
 * @param {Function} props.removePointsFromPlan (planId, pointIds)
 * @param {Function} props.lockPlan (planId)
 * @param {Function} props.publishPlan (planId) => 返回更新后的计划
 */
export default function PlanManage({
  plans,
  customers,
  points,
  createPlan,
  updatePlan,
  deletePlan,
  addPointsToPlan,
  removePointsFromPlan,
  lockPlan,
  publishPlan,
}) {
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState(EMPTY_PLAN);
  const [activeId, setActiveId] = useState(null); // 正在操作的计划 id
  const [showPicker, setShowPicker] = useState(false);
  const [notice, setNotice] = useState(null); // 上画通知书数据

  const activePlan = plans.find((p) => p.id === activeId) || null;
  // 新建计划允许任意授权状态的客户（未授权 / 审批中 / 已授权 均可）。
  const selectableCustomers = customers;

  // 进入计划详情：若处于草稿则推进为「选点中」。
  const openPlan = (plan) => {
    setActiveId(plan.id);
    if (plan.status === '草稿') updatePlan({ ...plan, status: '选点中' });
  };

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const saveNew = () => {
    const cust = customers.find((c) => c.id === form.customerId);
    if (!cust) {
      alert('请选择客户');
      return;
    }
    if (!form.planName.trim()) {
      alert('请填写方案名称');
      return;
    }
    createPlan({
      ...form,
      customerName: cust.name,
      city: form.city || cust.city || '',
    });
    setShowNew(false);
    setForm(EMPTY_PLAN);
  };

  const doLock = () => {
    if (!activePlan || activePlan.pointIds.length === 0) {
      alert('请先选点');
      return;
    }
    lockPlan(activePlan.id);
  };

  const doPublish = () => {
    if (!activePlan || activePlan.status !== '已锁') {
      alert('仅「已锁」状态的计划可以发布');
      return;
    }
    const updated = publishPlan(activePlan.id);
    setNotice(updated);
  };

  return (
    <div className="space-y-4">
      {/* 工具条 */}
      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="text-sm text-slate-600">
          计划总数 <span className="font-semibold text-slate-800">{plans.length}</span>
        </div>
        <button
          type="button"
          onClick={() => setShowNew(true)}
          className="rounded-md bg-brand-600 px-3 py-1.5 text-sm text-white hover:bg-brand-700"
        >
          + 新建计划
        </button>
      </div>

      {/* 计划卡片列表 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {plans.map((p) => (
          <PlanCard
            key={p.id}
            plan={p}
            onOpen={() => openPlan(p)}
            onDelete={() => {
              if (confirm(`确认删除计划「${p.planName}」？相关点位将回到可选状态。`)) {
                deletePlan(p.id);
              }
            }}
          />
        ))}
        {plans.length === 0 && (
          <div className="col-span-full rounded-lg border border-dashed border-slate-300 bg-white py-12 text-center text-slate-400">
            暂无投放计划，点击「新建计划」开始
          </div>
        )}
      </div>

      {/* 新建计划弹窗 */}
      <Modal open={showNew} onClose={() => setShowNew(false)} title="新建投放计划">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <FormField label="客户（任意授权状态均可）" full>
            <select
              className="input"
              value={form.customerId}
              onChange={(e) => setField('customerId', e.target.value)}
            >
              <option value="">请选择客户</option>
              {selectableCustomers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.authStatus === '已授权' ? '' : `（${c.authStatus}）`}
                </option>
              ))}
            </select>
            {selectableCustomers.length === 0 && (
              <span className="mt-1 block text-xs text-orange-600">
                暂无客户，请先在「客户管理」录入。
              </span>
            )}
          </FormField>
          <FormField label="方案名称 *">
            <input className="input" value={form.planName} onChange={(e) => setField('planName', e.target.value)} />
          </FormField>
          <FormField label="发布城市">
            <input className="input" value={form.city} onChange={(e) => setField('city', e.target.value)} />
          </FormField>
          <FormField label="发布周期（周）">
            <input
              type="number"
              min={1}
              className="input"
              value={form.weeks}
              onChange={(e) => setField('weeks', Number(e.target.value) || 1)}
            />
          </FormField>
          <FormField label="周发布量（上画数量）">
            <input
              type="number"
              min={0}
              className="input"
              value={form.weeklyQty}
              onChange={(e) => setField('weeklyQty', Number(e.target.value) || 0)}
            />
          </FormField>
          <FormField label="单价（元/面，可改）">
            <input
              type="number"
              min={0}
              className="input"
              value={form.unitPrice}
              onChange={(e) => setField('unitPrice', Number(e.target.value) || 0)}
            />
          </FormField>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setShowNew(false)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            取消
          </button>
          <button
            type="button"
            onClick={saveNew}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700"
          >
            创建
          </button>
        </div>
      </Modal>

      {/* 计划详情 / 操作弹窗 */}
      {activePlan && (
        <PlanDetailModal
          plan={activePlan}
          points={points}
          onClose={() => setActiveId(null)}
          onOpenPicker={() => setShowPicker(true)}
          onRemovePoints={(ids) => removePointsFromPlan(activePlan.id, ids)}
          onLock={doLock}
          onPublish={doPublish}
          onUpdatePlan={updatePlan}
        />
      )}

      {/* 选点弹窗 */}
      {activePlan && showPicker && (
        <PointPicker
          points={points}
          plan={activePlan}
          onClose={() => setShowPicker(false)}
          onAdd={(ids) => addPointsToPlan(activePlan.id, ids)}
        />
      )}

      {/* 上画通知书 */}
      {notice && (
        <PublishNoticeModal notice={notice} points={points} onClose={() => setNotice(null)} />
      )}
    </div>
  );
}

// ===== 子组件 =====

function PlanCard({ plan, onOpen, onDelete }) {
  const qty = plan.pointIds?.length || 0;
  const total = (plan.unitPrice || 0) * qty;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-semibold text-slate-800">{plan.planName}</div>
          <div className="mt-0.5 text-sm text-slate-500">{plan.customerName}</div>
        </div>
        <PlanStatusBadge status={plan.status} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-slate-600">
        <div>发布城市：{plan.city || '—'}</div>
        <div>周期：{plan.weeks} 周</div>
        <div>上画数量：{qty}</div>
        <div>总报价：¥{total.toLocaleString()}</div>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onOpen}
          className="flex-1 rounded-md bg-brand-600 px-3 py-1.5 text-sm text-white hover:bg-brand-700"
        >
          进入操作
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
        >
          删除
        </button>
      </div>
    </div>
  );
}

function PlanStatusBadge({ status }) {
  const map = {
    草稿: 'gray',
    选点中: 'yellow',
    已选: 'blue',
    已锁: 'indigo',
    已发布: 'green',
  };
  return <Badge color={map[status] || 'gray'}>{status}</Badge>;
}

/** 计划详情与状态机操作。 */
function PlanDetailModal({ plan, points, onClose, onOpenPicker, onRemovePoints, onLock, onPublish, onUpdatePlan }) {
  const [unitPrice, setUnitPrice] = useState(plan.unitPrice || 0);
  const [weeks, setWeeks] = useState(plan.weeks || 1);
  const [weeklyQty, setWeeklyQty] = useState(plan.weeklyQty || 0);

  useEffect(() => {
    setUnitPrice(plan.unitPrice || 0);
    setWeeks(plan.weeks || 1);
    setWeeklyQty(plan.weeklyQty || 0);
  }, [plan.id]); // eslint-disable-line

  const saveMeta = () => {
    onUpdatePlan({ ...plan, unitPrice, weeks, weeklyQty });
  };

  const qty = plan.pointIds?.length || 0;
  const total = (Number(unitPrice) || 0) * qty;
  const planPoints = useMemo(
    () => points.filter((p) => plan.pointIds?.includes(p.id)),
    [points, plan.pointIds]
  );

  const canLock = ['选点中', '已选'].includes(plan.status) && qty > 0;
  const canPublish = plan.status === '已锁';

  // 分页展示已选点位（每页 30）。
  const [page, setPage] = useState(1);
  const PAGE = 30;
  const totalPages = Math.max(1, Math.ceil(planPoints.length / PAGE));
  const pageRows = planPoints.slice((page - 1) * PAGE, page * PAGE);

  return (
    <Modal open onClose={onClose} title={`计划操作 · ${plan.planName}`} width="max-w-4xl">
      {/* 概要 + 参数编辑 */}
      <div className="grid grid-cols-2 gap-3 rounded-md border border-slate-200 p-3 md:grid-cols-4">
        <Meta label="客户">{plan.customerName}</Meta>
        <Meta label="发布城市">{plan.city || '—'}</Meta>
        <Meta label="状态">
          <PlanStatusBadge status={plan.status} />
        </Meta>
        <Meta label="上画数量">{qty}</Meta>
        <label className="block">
          <span className="mb-1 block text-xs text-slate-500">发布周期（周）</span>
          <input
            type="number"
            min={1}
            className="input"
            value={weeks}
            onChange={(e) => setWeeks(Number(e.target.value) || 1)}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-slate-500">周发布量</span>
          <input
            type="number"
            min={0}
            className="input"
            value={weeklyQty}
            onChange={(e) => setWeeklyQty(Number(e.target.value) || 0)}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-slate-500">单价（元/面）</span>
          <input
            type="number"
            min={0}
            className="input"
            value={unitPrice}
            onChange={(e) => setUnitPrice(Number(e.target.value) || 0)}
          />
        </label>
        <div className="flex items-end">
          <div className="text-sm">
            <div className="text-xs text-slate-500">总报价</div>
            <div className="font-semibold text-slate-800">¥{total.toLocaleString()}</div>
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={saveMeta}
        className="mt-2 rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
      >
        保存参数
      </button>

      {/* 状态机操作 */}
      <div className="mt-4 flex flex-wrap gap-2 rounded-md border border-slate-200 bg-slate-50 p-3">
        <button
          type="button"
          onClick={onOpenPicker}
          className="rounded-md bg-brand-600 px-3 py-2 text-sm text-white hover:bg-brand-700"
        >
          选点（加入点位）
        </button>
        <button
          type="button"
          disabled={!canLock}
          onClick={onLock}
          className="rounded-md bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          锁点
        </button>
        <button
          type="button"
          disabled={!canPublish}
          onClick={onPublish}
          className="rounded-md bg-green-600 px-3 py-2 text-sm text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          发布 / 上画
        </button>
        <span className="ml-auto self-center text-xs text-slate-500">
          状态机：草稿 → 选点中 → 已选 → 已锁 → 已发布
        </span>
      </div>

      {/* 已选点位清单 */}
      <div className="mt-4">
        <div className="mb-2 text-sm font-medium text-slate-700">
          已选点位（{planPoints.length}）
        </div>
        <div className="max-h-72 overflow-auto rounded-md border border-slate-200">
          <table className="min-w-[800px] border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-slate-600">
                <Th>资源名称</Th>
                <Th>城市</Th>
                <Th>媒体类型</Th>
                <Th>状态</Th>
                <Th className="text-right">操作</Th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((p) => (
                <tr key={p.id} className="border-t border-slate-100">
                  <Td className="font-medium text-slate-800">{p.project}</Td>
                  <Td>{p.city}</Td>
                  <Td>{p.mediaType}</Td>
                  <Td>
                    <Badge color={p.status === '已发布' ? 'green' : p.status === '已锁' ? 'indigo' : 'blue'}>
                      {p.status}
                    </Badge>
                  </Td>
                  <Td className="text-right">
                    <button
                      type="button"
                      onClick={() => onRemovePoints([p.id])}
                      className="text-xs text-red-600 hover:underline"
                    >
                      移除
                    </button>
                  </Td>
                </tr>
              ))}
              {planPoints.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    尚未选点
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="mt-2 flex items-center justify-end gap-1 text-sm text-slate-500">
            <button onClick={() => setPage((x) => Math.max(1, x - 1))} className="rounded border border-slate-300 px-2 py-1">
              上一页
            </button>
            <span>
              {page} / {totalPages}
            </span>
            <button onClick={() => setPage((x) => Math.min(totalPages, x + 1))} className="rounded border border-slate-300 px-2 py-1">
              下一页
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}

/** 从点位库筛选并勾选加入计划。 */
function PointPicker({ points, plan, onClose, onAdd }) {
  const [city, setCity] = useState('');
  const [media, setMedia] = useState('');
  const [status, setStatus] = useState('可选');
  const [kw, setKw] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState([]);
  const PAGE = 50;

  const cities = useMemo(() => {
    const s = new Set(points.map((p) => p.city).filter(Boolean));
    return Array.from(s).sort();
  }, [points]);

  const filtered = useMemo(() => {
    const k = kw.trim().toLowerCase();
    return points.filter((p) => {
      if (city && p.city !== city) return false;
      if (media && p.mediaType !== media) return false;
      if (status && p.status !== status) return false;
      if (k && !`${p.project || ''} ${p.address || ''}`.toLowerCase().includes(k)) return false;
      // 已在本计划中的不重复显示。
      if (plan.pointIds?.includes(p.id)) return false;
      return true;
    });
  }, [points, city, media, status, kw, plan.pointIds]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const rows = filtered.slice((page - 1) * PAGE, page * PAGE);
  const pageIds = rows.map((p) => p.id);
  const allSel = pageIds.length > 0 && pageIds.every((id) => selected.includes(id));

  useEffect(() => setPage(1), [city, media, status, kw]);

  const toggle = (id) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const togglePage = () =>
    setSelected((prev) =>
      allSel ? prev.filter((id) => !pageIds.includes(id)) : Array.from(new Set([...prev, ...pageIds]))
    );

  const confirm = () => {
    if (selected.length === 0) return;
    onAdd(selected);
    setSelected([]);
  };

  return (
    <Modal open onClose={onClose} title="从点位库选点" width="max-w-6xl">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <select className="input" value={city} onChange={(e) => setCity(e.target.value)}>
          <option value="">全部城市</option>
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select className="input" value={media} onChange={(e) => setMedia(e.target.value)}>
          <option value="">全部媒体类型</option>
          {MEDIA_TYPES.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">全部状态</option>
          {POINT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <input
          className="input"
          placeholder="关键字（资源名称/地址）"
          value={kw}
          onChange={(e) => setKw(e.target.value)}
        />
      </div>
      <div className="mt-2 text-xs text-slate-500">
        匹配 {filtered.length} 条 · 已选 {selected.length} 条（已在本计划的点位不显示）
      </div>

      <div className="mt-2 max-h-[50vh] overflow-auto rounded-md border border-slate-200">
        <table className="min-w-[1000px] border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-slate-600">
              <th className="px-2 py-2">
                <input type="checkbox" checked={allSel} onChange={togglePage} />
              </th>
              <Th>资源名称</Th>
              <Th>城市</Th>
              <Th>媒体类型</Th>
              <Th>楼盘类型</Th>
              <Th>状态</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-t border-slate-100 hover:bg-blue-50/40">
                <td className="px-2 py-2">
                  <input type="checkbox" checked={selected.includes(p.id)} onChange={() => toggle(p.id)} />
                </td>
                <Td className="font-medium text-slate-800">{p.project}</Td>
                <Td>{p.city}</Td>
                <Td>{p.mediaType}</Td>
                <Td>{p.communityType}</Td>
                <Td>{p.status}</Td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  没有可加入的点位
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <div className="text-sm text-slate-500">
          第 {page} / {totalPages} 页
        </div>
        <div className="flex gap-1">
          <button onClick={() => setPage(1)} className="rounded border border-slate-300 px-2 py-1 text-sm">
            首页
          </button>
          <button
            onClick={() => setPage((x) => Math.max(1, x - 1))}
            disabled={page <= 1}
            className="rounded border border-slate-300 px-2 py-1 text-sm disabled:opacity-40"
          >
            上一页
          </button>
          <button
            onClick={() => setPage((x) => Math.min(totalPages, x + 1))}
            disabled={page >= totalPages}
            className="rounded border border-slate-300 px-2 py-1 text-sm disabled:opacity-40"
          >
            下一页
          </button>
        </div>
      </div>

      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
        >
          取消
        </button>
        <button
          type="button"
          disabled={selected.length === 0}
          onClick={confirm}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700 disabled:bg-slate-300"
        >
          加入本计划（{selected.length}）
        </button>
      </div>
    </Modal>
  );
}

/** 上画通知书（可打印）。 */
function PublishNoticeModal({ notice, points, onClose }) {
  const planPoints = useMemo(
    () => points.filter((p) => notice.pointIds?.includes(p.id)),
    [points, notice.pointIds]
  );
  const qty = planPoints.length;
  const total = (notice.unitPrice || 0) * qty;

  return (
    <Modal open onClose={onClose} title="上画通知书" width="max-w-3xl">
      <div className="print-area rounded-md border border-slate-300 p-6">
        <h2 className="text-center text-xl font-bold text-slate-800">上 画 通 知 书</h2>
        <div className="mt-4 space-y-1 text-sm text-slate-700">
          <div>客户名称：{notice.customerName}</div>
          <div>方案名称：{notice.planName}</div>
          <div>发布城市：{notice.city || '—'}</div>
          <div>发布周期：{notice.weeks} 周（周发布量 {notice.weeklyQty}）</div>
          <div>上画数量：{qty} 面</div>
          <div>单价：{notice.unitPrice} 元/面</div>
          <div className="font-semibold">总报价：¥{total.toLocaleString()}</div>
          <div>发布日期：{notice.publishedAt || '—'}</div>
        </div>

        <div className="mt-4 text-sm font-semibold text-slate-700">点位清单</div>
        <table className="mt-2 w-full border-collapse text-xs">
          <thead>
            <tr className="border bg-slate-50">
              <th className="border px-2 py-1">#</th>
              <th className="border px-2 py-1">资源名称</th>
              <th className="border px-2 py-1">城市</th>
              <th className="border px-2 py-1">媒体类型</th>
              <th className="border px-2 py-1">详细地址</th>
            </tr>
          </thead>
          <tbody>
            {planPoints.map((p, i) => (
              <tr key={p.id} className="border">
                <td className="border px-2 py-1 text-center">{i + 1}</td>
                <td className="border px-2 py-1">{p.project}</td>
                <td className="border px-2 py-1">{p.city}</td>
                <td className="border px-2 py-1">{p.mediaType}</td>
                <td className="border px-2 py-1">{p.address}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-8 flex justify-between text-sm text-slate-600">
          <div>客户签字：________________</div>
          <div>媒介确认：________________</div>
        </div>
      </div>

      <div className="no-print mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
        >
          关闭
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700"
        >
          打印 / 导出 PDF
        </button>
      </div>
    </Modal>
  );
}

// ===== 通用小部件 =====
function FormField({ label, children, full }) {
  return (
    <label className={`block ${full ? 'md:col-span-2' : ''}`}>
      <span className="mb-1 block text-xs text-slate-500">{label}</span>
      {children}
    </label>
  );
}
function Meta({ label, children }) {
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-sm text-slate-800">{children}</div>
    </div>
  );
}
function Th({ children, className = '' }) {
  return <th className={`whitespace-nowrap px-3 py-2 font-medium ${className}`}>{children}</th>;
}
function Td({ children, className = '' }) {
  return <td className={`whitespace-nowrap px-3 py-2 text-slate-700 ${className}`}>{children}</td>;
}
