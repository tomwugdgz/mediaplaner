import React from 'react';

/**
 * Badge —— 通用彩色标签。
 * @param {Object} props
 * @param {string} props.color 颜色主题：blue/green/orange/yellow/gray/red
 * @param {React.ReactNode} props.children 内容
 */
const COLOR_MAP = {
  blue: 'bg-blue-100 text-blue-700',
  green: 'bg-green-100 text-green-700',
  orange: 'bg-orange-100 text-orange-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  gray: 'bg-slate-100 text-slate-600',
  red: 'bg-red-100 text-red-700',
  indigo: 'bg-indigo-100 text-indigo-700',
};

export default function Badge({ color = 'gray', children }) {
  const cls = COLOR_MAP[color] || COLOR_MAP.gray;
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${cls}`}>
      {children}
    </span>
  );
}

/**
 * StatusBadge —— 点位状态徽章（按状态映射颜色）。
 * @param {Object} props
 * @param {string} props.status 点位状态
 */
export function StatusBadge({ status }) {
  const map = {
    可选: 'gray',
    已选: 'blue',
    已锁: 'indigo',
    已发布: 'green',
  };
  return <Badge color={map[status] || 'gray'}>{status}</Badge>;
}

/**
 * DupBadge —— 重复标记徽章。
 * 跨来源重复=橙、来源内重复=黄、独占=灰。
 * @param {Object} props
 * @param {string} props.dup 重复标记
 */
export function DupBadge({ dup }) {
  const map = {
    跨来源重复: 'orange',
    来源内重复: 'yellow',
    独占: 'gray',
  };
  return <Badge color={map[dup] || 'gray'}>{dup}</Badge>;
}
