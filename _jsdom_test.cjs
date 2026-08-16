/**
 * 点位管理系统 —— jsdom 无头真跑防崩溃 + 全流程验证。
 * 模拟真实用户操作：建客户(未授权) → 建计划(无闸门) → 进入操作 → 选点 → 锁点 → 发布，
 * 并断言状态机推进与 localStorage 持久化，全程捕获 JS 运行期错误。
 *
 * 运行：node _jsdom_test.cjs   （需先 npm install jsdom）
 */
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const path = require('path');

const file = process.argv[2] || path.join(__dirname, '点位管理系统.html');
const html = fs.readFileSync(file, 'utf8');

const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', (e) => errors.push('jsdomError: ' + (e && (e.stack || e.message))));
vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));

const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  resources: 'usable',
  url: 'http://localhost/', // 真实源 → localStorage 可用（模拟 file:// 双击场景）
  virtualConsole: vc,
  pretendToBeVisual: true,
});
const { window } = dom;
// 屏蔽 jsdom 未实现 API 噪声（业务不依赖）
window.alert = () => {};
window.confirm = () => true;
window.onerror = (msg, src, line, col, err) => {
  errors.push('window.onerror: ' + (err && err.stack ? err.stack : msg));
};

const doc = window.document;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function findButton(text) {
  return [...doc.querySelectorAll('button')].find((b) => (b.textContent || '').trim().includes(text));
}
function click(el) {
  if (!el) throw new Error('未找到可点击元素');
  el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
}
function setInput(el, value) {
  const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
  setter.call(el, value);
  el.dispatchEvent(new window.Event('input', { bubbles: true }));
}
function setSelect(el, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
  setter.call(el, value);
  el.dispatchEvent(new window.Event('change', { bubbles: true }));
}
function inputForLabel(text) {
  const label = [...doc.querySelectorAll('label')].find((l) => (l.textContent || '').includes(text));
  return label ? label.querySelector('input,select,textarea') : null;
}
function getStore(key) {
  const raw = window.localStorage.getItem(key);
  return raw ? JSON.parse(raw) : null;
}

const results = [];
function check(name, cond) {
  results.push((cond ? 'PASS' : 'FAIL') + ' · ' + name);
  if (!cond) throw new Error('断言失败: ' + name);
}

(async () => {
  // 等待 React 挂载
  let mounted = false;
  for (let i = 0; i < 200; i++) {
    const root = doc.querySelector('#root');
    if (root && root.children.length > 0) { mounted = true; break; }
    await sleep(100);
  }
  check('React 成功挂载（#root 有内容）', mounted);
  await sleep(300);

  check('标题「点位管理系统」渲染', doc.body.textContent.includes('点位管理系统'));
  check('内置点位数渲染（13,456）', doc.body.textContent.includes('13,456') || doc.body.textContent.includes('13456'));
  check('四个 Tab 存在', ['总览', '点位管理', '客户管理', '投放计划'].every((t) => findButton(t)));

  // 切换各 Tab 不崩溃
  for (const t of ['点位管理', '客户管理', '投放计划', '总览']) {
    click(findButton(t)); await sleep(200);
    check('切换 Tab【' + t + '】正常渲染', doc.querySelector('#root').children.length > 0);
  }

  // —— 新建客户（未授权，验证无闸门）——
  click(findButton('客户管理')); await sleep(200);
  click(findButton('+ 新建客户')); await sleep(200);
  const custNameInput = inputForLabel('客户名称全称');
  check('客户名称输入框存在', !!custNameInput);
  setInput(custNameInput, '岚图汽车测试客户'); await sleep(80);
  click(findButton('保存')); await sleep(250);
  check('客户「岚图汽车测试客户」已建（表格出现）', doc.body.textContent.includes('岚图汽车测试客户'));
  const customers = getStore('pdgl_customers_v1') || [];
  check('localStorage 写入客户（authStatus=未授权）', customers.length === 1 && customers[0].authStatus === '未授权');
  const custId = customers[0] && customers[0].id;

  // —— 新建计划（任意授权状态客户均可）——
  click(findButton('投放计划')); await sleep(200);
  click(findButton('+ 新建计划')); await sleep(200);
  const custSelect = inputForLabel('客户（任意授权状态均可）');
  check('计划客户下拉存在', !!custSelect);
  const opt = [...custSelect.options].find((o) => (o.textContent || '').includes('岚图汽车测试客户'));
  check('未授权客户出现在计划下拉（无闸门）', !!opt);
  setSelect(custSelect, opt.value); await sleep(80);
  const planNameInput = inputForLabel('方案名称');
  setInput(planNameInput, '岚图首批电梯框架投放'); await sleep(80);
  click(findButton('创建')); await sleep(300);
  let plans = getStore('pdgl_plans_v1') || [];
  check('计划已创建（localStorage 1 条）', plans.length === 1);
  check('计划初始状态=草稿', plans[0].status === '草稿');
  const planId = plans[0] && plans[0].id;

  // —— 进入操作（草稿→选点中）——
  click(findButton('进入操作')); await sleep(250);
  plans = getStore('pdgl_plans_v1') || [];
  check('进入操作后状态=选点中', plans[0].status === '选点中');

  // —— 选点 ——
  click(findButton('选点（加入点位）')); await sleep(250);
  const firstRowCb = [...doc.querySelectorAll('input[type=checkbox]')].find((cb) => {
    const tr = cb.closest('tr');
    return tr && tr.querySelector('td'); // 数据行 checkbox（thead 用 th，排除表头全选）
  });
  check('选点弹窗出现可勾选点位', !!firstRowCb);
  click(firstRowCb); await sleep(120);
  const addBtn = findButton('加入本计划');
  check('加入本计划按钮存在', !!addBtn);
  click(addBtn); await sleep(300);
  plans = getStore('pdgl_plans_v1') || [];
  let ov = getStore('pdgl_point_overrides_v1') || {};
  const selIds = (plans[0] && plans[0].pointIds) || [];
  check('计划已选入点位（pointIds>0）', selIds.length > 0);
  check('计划状态推进为 已选/选点中', ['已选', '选点中'].includes(plans[0].status));
  check('点位覆盖层状态=已选', selIds.every((id) => ov[id] && ov[id].status === '已选'));

  // 关闭选点弹窗
  const cancelBtn = findButton('取消');
  if (cancelBtn) { click(cancelBtn); await sleep(200); }

  // —— 锁点 ——
  const lockBtn = findButton('锁点');
  check('锁点按钮可用（未禁用）', lockBtn && !lockBtn.disabled);
  click(lockBtn); await sleep(300);
  plans = getStore('pdgl_plans_v1') || [];
  check('计划状态=已锁', plans[0].status === '已锁');
  ov = getStore('pdgl_point_overrides_v1') || {}; // 重新读取最新覆盖层
  check('点位覆盖层状态=已锁', selIds.every((id) => ov[id] && ov[id].status === '已锁'));

  // —— 发布 ——
  const pubBtn = findButton('发布 / 上画');
  check('发布按钮可用（未禁用）', pubBtn && !pubBtn.disabled);
  click(pubBtn); await sleep(300);
  plans = getStore('pdgl_plans_v1') || [];
  check('计划状态=已发布', plans[0].status === '已发布');
  ov = getStore('pdgl_point_overrides_v1') || {}; // 重新读取最新覆盖层
  check('上画通知书已生成（含标题）', doc.body.textContent.includes('上 画 通 知 书'));
  check('点位覆盖层状态=已发布', selIds.every((id) => ov[id] && ov[id].status === '已发布'));

  // 运行期错误总检
  check('运行期无 JS 错误（jsdomError / console.error / onerror）', errors.length === 0);

  console.log('\n========== 验证结果 ==========');
  results.forEach((r) => console.log(r));
  console.log('\n错误捕获：', errors.length ? errors : '无');
  console.log('\n结论：全部通过 ✅');
  process.exit(0);
})().catch((e) => {
  console.log('\n========== 验证结果 ==========');
  results.forEach((r) => console.log(r));
  console.log('\n错误捕获：', errors.length ? errors : '无');
  console.log('\n结论：失败 ❌ →', e.message);
  process.exit(1);
});
