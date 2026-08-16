import React, { useState, useRef } from 'react';
import Modal from './Modal.jsx';
import Badge from './Badge.jsx';
import { AUTH_STATUS, CUSTOMER_CATEGORY } from '../store.js';

const EMPTY_CUSTOMER = {
  name: '',
  shortName: '',
  brand: '',
  industry: '',
  city: '',
  address: '',
  budget: '',
  contact: '',
  phone: '',
  agency: '',
  progress: '',
  purpose: '',
  authStatus: '未授权',
  category: 'C',
  visits: [],
};

/**
 * CustomerManage —— 客户管理。
 * CRUD + 授权流程模拟 + 拜访记录 + 导出/导入备份。
 * @param {Object} props
 * @param {Array<Object>} props.customers 客户列表
 * @param {Function} props.addCustomer
 * @param {Function} props.updateCustomer
 * @param {Function} props.deleteCustomer
 */
export default function CustomerManage({ customers, addCustomer, updateCustomer, deleteCustomer }) {
  const [editing, setEditing] = useState(null); // null=关闭, 'new'=新建, 对象=编辑
  const [form, setForm] = useState(EMPTY_CUSTOMER);
  const fileRef = useRef(null);

  const openNew = () => {
    setForm({ ...EMPTY_CUSTOMER, id: '', visits: [] });
    setEditing('new');
  };
  const openEdit = (c) => {
    setForm({ ...EMPTY_CUSTOMER, ...c, visits: c.visits ? [...c.visits] : [] });
    setEditing('edit');
  };

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = () => {
    if (!form.name.trim()) {
      alert('请填写客户名称全称');
      return;
    }
    if (editing === 'new') {
      addCustomer({ ...form, id: '' });
    } else {
      updateCustomer(form);
    }
    setEditing(null);
  };

  // ===== 授权流程 =====
  const requestAuth = (c) => updateCustomer({ ...c, authStatus: '审批中' });
  const approveAuth = (c) => updateCustomer({ ...c, authStatus: '已授权' });

  // ===== 拜访记录 =====
  const addVisit = () => {
    setForm((f) => ({ ...f, visits: [...f.visits, { time: '', content: '' }] }));
  };
  const updateVisit = (idx, key, val) => {
    setForm((f) => {
      const visits = f.visits.map((v, i) => (i === idx ? { ...v, [key]: val } : v));
      return { ...f, visits };
    });
  };
  const removeVisit = (idx) => {
    setForm((f) => ({ ...f, visits: f.visits.filter((_, i) => i !== idx) }));
  };

  // ===== 导出 / 导入 =====
  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(customers, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `客户备份_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const importJSON = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (Array.isArray(data)) {
          if (confirm(`确认导入 ${data.length} 条客户？将覆盖当前列表。`)) {
            // 重新生成 id 避免冲突。
            const imported = data.map((c) => ({
              ...EMPTY_CUSTOMER,
              ...c,
              id: '',
              visits: Array.isArray(c.visits) ? c.visits : [],
            }));
            imported.forEach((c) => addCustomer(c));
          }
        } else {
          alert('文件格式不正确（应为客户数组 JSON）');
        }
      } catch (err) {
        alert('解析失败：' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-4">
      {/* 工具条 */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="text-sm text-slate-600">
          客户总数 <span className="font-semibold text-slate-800">{customers.length}</span>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
          >
            导入备份
          </button>
          <button
            type="button"
            onClick={exportJSON}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
          >
            导出备份
          </button>
          <button
            type="button"
            onClick={openNew}
            className="rounded-md bg-brand-600 px-3 py-1.5 text-sm text-white hover:bg-brand-700"
          >
            + 新建客户
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={importJSON}
          />
        </div>
      </div>

      {/* 客户表格 */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="min-w-[1000px] border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-slate-600">
              <Th>客户全称</Th>
              <Th>简称</Th>
              <Th>品牌</Th>
              <Th>行业</Th>
              <Th>城市</Th>
              <Th>联系人/电话</Th>
              <Th>授权状态</Th>
              <Th>分类</Th>
              <Th>拜访</Th>
              <Th className="text-right">操作</Th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id} className="border-t border-slate-100 hover:bg-blue-50/40">
                <Td className="font-medium text-slate-800">{c.name}</Td>
                <Td>{c.shortName || '—'}</Td>
                <Td>{c.brand || '—'}</Td>
                <Td>{c.industry || '—'}</Td>
                <Td>{c.city || '—'}</Td>
                <Td>
                  {c.contact || '—'}
                  {c.phone ? ` / ${c.phone}` : ''}
                </Td>
                <Td>
                  <AuthBadge status={c.authStatus} />
                </Td>
                <Td>
                  <CategoryBadge category={c.category} />
                </Td>
                <Td>{c.visits?.length || 0} 次</Td>
                <Td className="text-right">
                  <div className="flex justify-end gap-1">
                    {c.authStatus === '未授权' && (
                      <MiniBtn onClick={() => requestAuth(c)}>发起授权</MiniBtn>
                    )}
                    {c.authStatus === '审批中' && (
                      <MiniBtn onClick={() => approveAuth(c)}>审批</MiniBtn>
                    )}
                    <MiniBtn onClick={() => openEdit(c)}>编辑</MiniBtn>
                    <MiniBtn danger onClick={() => deleteCustomer(c.id)}>
                      删除
                    </MiniBtn>
                  </div>
                </Td>
              </tr>
            ))}
            {customers.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-10 text-center text-slate-400">
                  暂无客户，点击「新建客户」开始录入
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 编辑/新建弹窗 */}
      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? '新建客户' : '编辑客户'}
        width="max-w-3xl"
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <FormField label="客户名称全称 *">
            <input className="input" value={form.name} onChange={(e) => setField('name', e.target.value)} />
          </FormField>
          <FormField label="简称">
            <input className="input" value={form.shortName} onChange={(e) => setField('shortName', e.target.value)} />
          </FormField>
          <FormField label="品牌">
            <input className="input" value={form.brand} onChange={(e) => setField('brand', e.target.value)} />
          </FormField>
          <FormField label="所属行业">
            <input className="input" value={form.industry} onChange={(e) => setField('industry', e.target.value)} />
          </FormField>
          <FormField label="城市">
            <input className="input" value={form.city} onChange={(e) => setField('city', e.target.value)} />
          </FormField>
          <FormField label="预算">
            <input className="input" value={form.budget} onChange={(e) => setField('budget', e.target.value)} placeholder="如 50万" />
          </FormField>
          <FormField label="联系人">
            <input className="input" value={form.contact} onChange={(e) => setField('contact', e.target.value)} />
          </FormField>
          <FormField label="电话">
            <input className="input" value={form.phone} onChange={(e) => setField('phone', e.target.value)} />
          </FormField>
          <FormField label="代理广告公司">
            <input className="input" value={form.agency} onChange={(e) => setField('agency', e.target.value)} />
          </FormField>
          <FormField label="授权状态">
            <select className="input" value={form.authStatus} onChange={(e) => setField('authStatus', e.target.value)}>
              {AUTH_STATUS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="客户分类">
            <select className="input" value={form.category} onChange={(e) => setField('category', e.target.value)}>
              {CUSTOMER_CATEGORY.map((c) => (
                <option key={c} value={c}>
                  {c}类
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="洽谈进度">
            <input className="input" value={form.progress} onChange={(e) => setField('progress', e.target.value)} placeholder="如 初次接洽 / 方案沟通" />
          </FormField>
          <FormField label="合作目的" full>
            <input className="input" value={form.purpose} onChange={(e) => setField('purpose', e.target.value)} />
          </FormField>
          <FormField label="地址" full>
            <input className="input" value={form.address} onChange={(e) => setField('address', e.target.value)} />
          </FormField>
        </div>

        {/* 拜访记录 */}
        <div className="mt-4 rounded-md border border-slate-200 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">拜访记录</span>
            <button type="button" onClick={addVisit} className="text-sm text-brand-600 hover:underline">
              + 添加拜访
            </button>
          </div>
          {form.visits.length === 0 && (
            <div className="text-xs text-slate-400">暂无拜访记录</div>
          )}
          <div className="space-y-2">
            {form.visits.map((v, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="date"
                  className="input w-40"
                  value={v.time}
                  onChange={(e) => updateVisit(idx, 'time', e.target.value)}
                />
                <input
                  className="input flex-1"
                  placeholder="拜访内容"
                  value={v.content}
                  onChange={(e) => updateVisit(idx, 'content', e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => removeVisit(idx)}
                  className="rounded px-2 py-1 text-sm text-red-600 hover:bg-red-50"
                >
                  删除
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setEditing(null)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            取消
          </button>
          <button
            type="button"
            onClick={save}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700"
          >
            保存
          </button>
        </div>
      </Modal>
    </div>
  );
}

// ===== 子组件 =====
function Th({ children, className = '' }) {
  return <th className={`whitespace-nowrap px-3 py-2 font-medium ${className}`}>{children}</th>;
}
function Td({ children, className = '' }) {
  return <td className={`whitespace-nowrap px-3 py-2 text-slate-700 ${className}`}>{children}</td>;
}
function FormField({ label, children, full }) {
  return (
    <label className={`block ${full ? 'md:col-span-2' : ''}`}>
      <span className="mb-1 block text-xs text-slate-500">{label}</span>
      {children}
    </label>
  );
}
function MiniBtn({ children, onClick, danger }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded px-2 py-1 text-xs ${
        danger ? 'text-red-600 hover:bg-red-50' : 'text-brand-600 hover:bg-brand-50'
      }`}
    >
      {children}
    </button>
  );
}
function AuthBadge({ status }) {
  const map = { 未授权: 'gray', 审批中: 'orange', 已授权: 'green' };
  return <Badge color={map[status] || 'gray'}>{status}</Badge>;
}
function CategoryBadge({ category }) {
  const map = { A: 'red', B: 'blue', C: 'gray' };
  return <Badge color={map[category] || 'gray'}>{category}类</Badge>;
}
