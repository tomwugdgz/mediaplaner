import React, { useMemo, useState, useRef, useEffect } from 'react';
import { BASE_POINTS, POINT_STATUSES, MEDIA_TYPES } from '../store.js';
import Drawer from './Drawer.jsx';
import { StatusBadge, DupBadge } from './Badge.jsx';

const PAGE_SIZE = 50;

/**
 * PointManage —— 点位管理（核心模块）。
 * 表格 + 多维筛选 + 分页 + 详情抽屉（改备注/状态）+ 批量选点加入计划。
 * @param {Object} props
 * @param {Array<Object>} props.points 合并后的点位数组
 * @param {Function} props.setOverride 更新单点位覆盖层 (id, patch)
 * @param {Array<Object>} props.plans 投放计划列表
 * @param {Function} props.addPointsToPlan 将点位加入计划 (planId, pointIds)
 */
export default function PointManage({ points, setOverride, plans, addPointsToPlan }) {
  // ===== 筛选状态 =====
  const [citySel, setCitySel] = useState([]); // 多选城市
  const [mediaSel, setMediaSel] = useState(''); // 媒体类型
  const [supplierSel, setSupplierSel] = useState(''); // 供应商
  const [statusSel, setStatusSel] = useState(''); // 状态
  const [keyword, setKeyword] = useState(''); // 关键字
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]); // 批量勾选
  const [detail, setDetail] = useState(null); // 详情点位
  const [addToPlanOpen, setAddToPlanOpen] = useState(false);
  const [targetPlan, setTargetPlan] = useState('');

  // 选项列表（城市/供应商）从基础数据一次性算出，避免随覆盖层变化重算。
  const { cities, suppliers } = useMemo(() => {
    const cSet = new Set();
    const sSet = new Set();
    BASE_POINTS.forEach((p) => {
      if (p.city) cSet.add(p.city);
      if (p.supplier) sSet.add(p.supplier);
    });
    return {
      cities: Array.from(cSet).sort(),
      suppliers: Array.from(sSet).sort(),
    };
  }, []);

  // ===== 过滤 =====
  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return points.filter((p) => {
      if (citySel.length > 0 && !citySel.includes(p.city)) return false;
      if (mediaSel && p.mediaType !== mediaSel) return false;
      if (supplierSel && p.supplier !== supplierSel) return false;
      if (statusSel && p.status !== statusSel) return false;
      if (kw) {
        const hay = `${p.project || ''} ${p.address || ''}`.toLowerCase();
        if (!hay.includes(kw)) return false;
      }
      return true;
    });
  }, [points, citySel, mediaSel, supplierSel, statusSel, keyword]);

  // 筛选变化后回到第一页。
  useEffect(() => {
    setPage(1);
  }, [citySel, mediaSel, supplierSel, statusSel, keyword]);

  // 当前页数据。
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // 全选当前页。
  const pageIds = pageRows.map((p) => p.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };
  const toggleSelectPage = () => {
    if (allPageSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const resetFilters = () => {
    setCitySel([]);
    setMediaSel('');
    setSupplierSel('');
    setStatusSel('');
    setKeyword('');
  };

  const confirmAddToPlan = () => {
    if (!targetPlan) return;
    addPointsToPlan(targetPlan, selectedIds);
    setAddToPlanOpen(false);
    setTargetPlan('');
    setSelectedIds([]);
  };

  return (
    <div className="space-y-4">
      {/* 筛选栏 */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Field label="关键字（资源名称/地址）">
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="输入关键字搜索"
              className="input"
            />
          </Field>

          <Field label="媒体类型">
            <select value={mediaSel} onChange={(e) => setMediaSel(e.target.value)} className="input">
              <option value="">全部</option>
              {MEDIA_TYPES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </Field>

          <Field label="供应商">
            <select
              value={supplierSel}
              onChange={(e) => setSupplierSel(e.target.value)}
              className="input"
            >
              <option value="">全部</option>
              {suppliers.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>

          <Field label="状态">
            <select value={statusSel} onChange={(e) => setStatusSel(e.target.value)} className="input">
              <option value="">全部</option>
              {POINT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>

          <Field label="城市（多选）">
            <CityMultiSelect selected={citySel} options={cities} onChange={setCitySel} />
          </Field>

          <div className="flex items-end">
            <button
              type="button"
              onClick={resetFilters}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              重置筛选
            </button>
          </div>
        </div>
        <div className="mt-2 text-xs text-slate-500">
          共筛选出 <span className="font-semibold text-slate-700">{filtered.length}</span> 条点位
        </div>
      </div>

      {/* 批量操作工具栏 */}
      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-2 shadow-sm">
        <div className="text-sm text-slate-600">
          已勾选 <span className="font-semibold text-brand-600">{selectedIds.length}</span> 条
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={selectedIds.length === 0}
            onClick={() => setAddToPlanOpen(true)}
            className="rounded-md bg-brand-600 px-3 py-1.5 text-sm text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            批量选点 → 加入计划
          </button>
          <button
            type="button"
            disabled={selectedIds.length === 0}
            onClick={() => setSelectedIds([])}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            清空勾选
          </button>
        </div>
      </div>

      {/* 点位表格 */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="min-w-[1400px] border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-slate-600">
              <th className="sticky left-0 z-10 w-10 bg-slate-50 px-2 py-2">
                <input type="checkbox" checked={allPageSelected} onChange={toggleSelectPage} />
              </th>
              <Th>媒体类型</Th>
              <Th>城市</Th>
              <Th>区域</Th>
              <Th>资源名称</Th>
              <Th>详细地址</Th>
              <Th>楼盘类型</Th>
              <Th>楼栋数</Th>
              <Th>单元门/电梯</Th>
              <Th>楼盘价格</Th>
              <Th>住户数</Th>
              <Th>媒体面数</Th>
              <Th>供应商</Th>
              <Th>状态</Th>
              <Th>重复标记</Th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((p) => (
              <tr
                key={p.id}
                className="cursor-pointer border-t border-slate-100 hover:bg-blue-50/40"
                onClick={() => setDetail(p)}
              >
                <td
                  className="sticky left-0 z-10 bg-white px-2 py-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(p.id)}
                    onChange={() => toggleSelect(p.id)}
                  />
                </td>
                <Td>{p.mediaType}</Td>
                <Td>{p.city}</Td>
                <Td>{p.area}</Td>
                <Td className="font-medium text-slate-800">{p.project}</Td>
                <Td className="max-w-[220px] truncate" title={p.address}>
                  {p.address}
                </Td>
                <Td>{p.communityType}</Td>
                <Td>{p.buildings}</Td>
                <Td>
                  {p.unitDoors ?? '-'} / {p.elevators ?? '-'}
                </Td>
                <Td>{p.price ? `${p.price} 元/㎡` : '-'}</Td>
                <Td>{p.households}</Td>
                <Td>{p.totalMedia}</Td>
                <Td>{p.supplier}</Td>
                <Td>
                  <StatusBadge status={p.status} />
                </Td>
                <Td>
                  <DupBadge dup={p.dupStatus} />
                </Td>
              </tr>
            ))}
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={14} className="px-4 py-10 text-center text-slate-400">
                  没有符合条件的点位
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      <Pagination page={safePage} totalPages={totalPages} onChange={setPage} total={filtered.length} />

      {/* 详情抽屉 */}
      <PointDetailDrawer
        point={detail}
        onClose={() => setDetail(null)}
        onSaveNote={(id, note) => setOverride(id, { note })}
        onChangeStatus={(id, status) => {
          const patch = { status };
          if (status === '可选') {
            patch.planId = null;
            patch.customer = null;
            patch.lockedAt = null;
            patch.publishedAt = null;
          }
          setOverride(id, patch);
        }}
      />

      {/* 加入计划弹窗 */}
      <AddToPlanModal
        open={addToPlanOpen}
        plans={plans}
        count={selectedIds.length}
        targetPlan={targetPlan}
        setTargetPlan={setTargetPlan}
        onClose={() => setAddToPlanOpen(false)}
        onConfirm={confirmAddToPlan}
      />
    </div>
  );
}

// ===== 子组件 =====

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function Th({ children }) {
  return <th className="whitespace-nowrap px-3 py-2 font-medium">{children}</th>;
}
function Td({ children, className = '' }) {
  return <td className={`whitespace-nowrap px-3 py-2 text-slate-700 ${className}`}>{children}</td>;
}

/** 分页控件。 */
function Pagination({ page, totalPages, onChange, total }) {
  return (
    <div className="flex items-center justify-between text-sm text-slate-600">
      <div>
        共 {total} 条 · 第 {page} / {totalPages} 页
      </div>
      <div className="flex gap-1">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onChange(1)}
          className="rounded border border-slate-300 px-2 py-1 hover:bg-slate-50 disabled:opacity-40"
        >
          首页
        </button>
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          className="rounded border border-slate-300 px-2 py-1 hover:bg-slate-50 disabled:opacity-40"
        >
          上一页
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          className="rounded border border-slate-300 px-2 py-1 hover:bg-slate-50 disabled:opacity-40"
        >
          下一页
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onChange(totalPages)}
          className="rounded border border-slate-300 px-2 py-1 hover:bg-slate-50 disabled:opacity-40"
        >
          末页
        </button>
      </div>
    </div>
  );
}

/** 城市多选下拉（带搜索）。 */
function CityMultiSelect({ selected, options, onChange }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filteredOpts = options.filter((o) => o.toLowerCase().includes(q.toLowerCase()));

  const toggle = (city) => {
    if (selected.includes(city)) onChange(selected.filter((c) => c !== city));
    else onChange([...selected, city]);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="input flex items-center justify-between"
      >
        <span className={selected.length ? 'text-slate-800' : 'text-slate-400'}>
          {selected.length ? `已选 ${selected.length} 个城市` : '全部城市'}
        </span>
        <span className="text-slate-400">▾</span>
      </button>
      {open && (
        <div className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-md border border-slate-200 bg-white shadow-lg">
          <div className="sticky top-0 bg-white p-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="搜索城市"
              className="input"
            />
          </div>
          <div className="px-2 pb-2">
            {filteredOpts.map((city) => (
              <label
                key={city}
                className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(city)}
                  onChange={() => toggle(city)}
                />
                <span>{city}</span>
              </label>
            ))}
            {filteredOpts.length === 0 && (
              <div className="px-2 py-1 text-sm text-slate-400">无匹配城市</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** 点位详情抽屉：全字段 + 备注编辑 + 状态变更。 */
function PointDetailDrawer({ point, onClose, onSaveNote, onChangeStatus }) {
  const [note, setNote] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (point) {
      setNote(point.note || '');
      setStatus(point.status || '可选');
    }
  }, [point]);

  if (!point) return null;

  const fields = [
    ['ID', point.id],
    ['媒体类型', point.mediaType],
    ['供应商', point.supplier],
    ['城市', point.city],
    ['区域', point.area],
    ['资源名称', point.project],
    ['详细地址', point.address],
    ['楼盘类型', point.communityType],
    ['楼栋数', point.buildings],
    ['单元门数', point.unitDoors],
    ['电梯数', point.elevators],
    ['楼盘价格(元/㎡)', point.price],
    ['住户数', point.households],
    ['入住年份', point.moveinYear],
    ['媒体面数', point.totalMedia],
    ['来源表', point.srcSheet],
    ['重复标记', point.dupStatus],
    ['所属计划', point.planId || '—'],
    ['关联客户', point.customer || '—'],
    ['锁位时间', point.lockedAt || '—'],
    ['上画时间', point.publishedAt || '—'],
  ];

  return (
    <Drawer open={!!point} onClose={onClose} title={`点位详情 · ${point.project}`}>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {fields.map(([k, v]) => (
          <div key={k} className="border-b border-slate-100 py-1">
            <dt className="text-xs text-slate-400">{k}</dt>
            <dd className="text-slate-800">{v ?? '—'}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-5 rounded-md border border-slate-200 p-3">
        <div className="mb-2 text-sm font-medium text-slate-700">状态变更</div>
        <div className="flex items-end gap-2">
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="input flex-1">
            {POINT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => onChangeStatus(point.id, status)}
            className="rounded-md bg-brand-600 px-3 py-2 text-sm text-white hover:bg-brand-700"
          >
            保存状态
          </button>
        </div>
      </div>

      <div className="mt-4 rounded-md border border-slate-200 p-3">
        <div className="mb-2 text-sm font-medium text-slate-700">备注</div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="填写备注信息"
          className="input"
        />
        <button
          type="button"
          onClick={() => onSaveNote(point.id, note)}
          className="mt-2 rounded-md bg-slate-700 px-3 py-2 text-sm text-white hover:bg-slate-800"
        >
          保存备注
        </button>
      </div>
    </Drawer>
  );
}

/** 加入计划弹窗。 */
function AddToPlanModal({ open, plans, count, targetPlan, setTargetPlan, onClose, onConfirm }) {
  if (!open) return null;
  const selectable = plans.filter((p) => p.status !== '已发布');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 no-print">
      <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
        <h3 className="mb-3 text-base font-semibold text-slate-800">
          批量选点（{count} 条）加入计划
        </h3>
        <label className="mb-1 block text-xs text-slate-500">选择投放计划</label>
        <select value={targetPlan} onChange={(e) => setTargetPlan(e.target.value)} className="input">
          <option value="">请选择计划</option>
          {selectable.map((p) => (
            <option key={p.id} value={p.id}>
              {p.planName}（{p.customerName} · {p.status}）
            </option>
          ))}
        </select>
        {selectable.length === 0 && (
          <div className="mt-2 text-xs text-orange-600">
            暂无可选计划，请先在「投放计划」中新建计划。
          </div>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            取消
          </button>
          <button
            type="button"
            disabled={!targetPlan}
            onClick={onConfirm}
            className="rounded-md bg-brand-600 px-3 py-2 text-sm text-white hover:bg-brand-700 disabled:bg-slate-300"
          >
            确认加入
          </button>
        </div>
      </div>
    </div>
  );
}
