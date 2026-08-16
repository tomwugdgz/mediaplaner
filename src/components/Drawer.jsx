import React from 'react';

/**
 * Drawer —— 右侧详情抽屉。
 * @param {Object} props
 * @param {boolean} props.open 是否打开
 * @param {Function} props.onClose 关闭回调
 * @param {string} props.title 标题
 * @param {React.ReactNode} props.children 内容
 */
export default function Drawer({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex justify-end no-print">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3">
          <h3 className="text-base font-semibold text-slate-800">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="关闭"
          >
            ✕
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
