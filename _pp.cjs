/**
 * 后处理：仅把 singlefile 保留的 <script type="module" crossorigin> 标记去掉，转经典脚本。
 * 不再移动脚本位置 —— 时序问题已由 src/main.jsx 的 DOMContentLoaded 守卫解决，
 * 经典脚本无论在 head 还是 body 末尾都能在 #root 就绪后挂载。
 * 不解析/截取脚本内容，避免包体内含 </script> 字样时被正则截断。
 */
const fs = require('fs');
const src = 'dist/index.html';
const out = '点位管理系统.html';

let h = fs.readFileSync(src, 'utf8');
const before = h;
h = h.replace('<script type="module" crossorigin>', '<script>');
// 兜底：任何残留的 module 标签也转经典。
h = h.replace(/<script type="module">/g, '<script>');

fs.writeFileSync(out, h);
console.log('已转经典脚本:', h !== before);
console.log('剩余 module 标签数:', (h.match(/type="module"/g) || []).length);
console.log('交付文件大小(bytes):', h.length);
