import React from 'react';

/**
 * Modal —— 通用模态弹窗。
 * @param {Object} props
 * @param {boolean} props.open 是否打开
 * @param {Function} props.onClose 关闭回调
 * @param {string} props.title 标题
 * @param {React.ReactNode} props.children 内容
 * @param {string} [props.width] 最大宽度类，默认 max-w-2xl
 */
export default function Modal({ open, onClose, title, children, width = 'max-w-2xl' }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/40 p-4 no-print">
      <div
        className={`mt-10 w-full ${width} rounded-lg bg-white shadow-xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
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
        <div className="max-h-[75vh] overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
