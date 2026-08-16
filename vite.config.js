import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Vite 配置：React 插件 + 单文件打包插件。
// base 使用相对路径 './'，保证产物在 file:// 下双击也能加载。
export default defineConfig({
  base: './',
  plugins: [react(), viteSingleFile()],
  build: {
    // 不清理输出目录：本环境的安全删除封装对中文路径删除会失败（fail-closed），
    // 关闭后 Vite 直接覆盖写入 index.html，避免触发删除。
    emptyOutDir: false,
    // 单文件模式下关闭 CSS 分包，全部内联。
    cssCodeSplit: false,
    // 提高资源内联阈值，确保 6.4MB 数据也被内联进 HTML。
    assetsInlineLimit: 100000000,
    // 关闭构建体积告警（数据内置属预期）。
    chunkSizeWarningLimit: 100000,
    target: 'es2018',
  },
});
