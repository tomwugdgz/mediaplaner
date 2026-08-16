import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// 应用入口：挂载根组件。
// 兼容 singlefile 把打包脚本提升至 <head> 的场景：经典脚本在 head 会先于 #root 执行，
// 故等待 DOM 就绪后再挂载，避免 “Target container is not a DOM element”。
function mount() {
  const el = document.getElementById('root');
  if (!el) return;
  createRoot(el).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount);
} else {
  mount();
}
