import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as documentModel from '../features/documents/documentModel.ts';

// Run the actual component event handlers with an in-memory vault and React
// adapter. Browser focus/preview behavior is verified separately through UI.
const vault = { documents: [], loading: false, error: undefined, save: async () => {}, read: async () => undefined, remove: async () => {} };
let cursor = 0;
const slots = [];
const react = {
  useEffect: () => {},
  useMemo: (factory) => factory(),
  useState(value) {
    const index = cursor++;
    if (!(index in slots)) slots[index] = value;
    return [slots[index], (next) => { slots[index] = typeof next === 'function' ? next(slots[index]) : next; }];
  },
  useRef(value) {
    const index = cursor++;
    return slots[index] ??= { current: value };
  },
};
const jsx = (type, props) => ({ type, props });
const imports = {
  react,
  'react/jsx-runtime': { jsx, jsxs: jsx },
  'lucide-react': Object.fromEntries(['FileText', 'Image', 'LockKeyhole', 'Plus', 'Trash2', 'X'].map((name) => [name, name])),
  '@/hooks/use-dialog-lifecycle': { useDialogLifecycle: () => ({ current: null }) },
  '@/features/app/appModel': { cityNames: ['罗马'] },
  '@/features/documents/documentModel': documentModel,
  '@/features/documents/useDocumentVault': { useDocumentVault: () => vault },
  '@/components/readiness/readiness.css': {},
};
const source = fs.readFileSync(new URL('../components/documents/DocumentsPanel.tsx', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
let confirmResult = false;
let confirmMessage;
const exports = {};
vm.runInNewContext(compiled, { exports, window: { confirm: (message) => { confirmMessage = message; return confirmResult; } }, navigator: { storage: { persist: async () => false } }, require: (name) => {
  assert.ok(Object.hasOwn(imports, name), `Unexpected dependency: ${name}`);
  return imports[name];
} });
const render = () => { cursor = 0; return exports.DocumentsPanel({ bookings: [] }); };
const nodes = (node) => Array.isArray(node) ? node.flatMap(nodes) : node && typeof node === 'object' ? [node, ...nodes(node.props?.children)] : [];
const find = (tree, predicate) => nodes(tree).find(predicate);
const button = (tree, text) => find(tree, (node) => node.type === 'button' && node.props.children === text);
const event = { preventDefault: () => {} };

let tree = render();
find(tree, (node) => node.type === 'button' && node.props.className === 'readiness-primary').props.onClick();
tree = render();
find(tree, (node) => node.type === 'input' && node.props.type === 'file').props.onChange({ target: { files: [new File(['public QA fixture'], 'qa.png', { type: 'image/png' })] } });
tree = render();
let release = () => {};
let reject = () => {};
let writes = 0;
vault.save = () => { writes++; return new Promise((resolve, fail) => { release = resolve; reject = fail; }); };
const submit = find(tree, (node) => node.type === 'form').props.onSubmit;
const first = submit(event);
await submit(event);
assert.equal(writes, 1, 'Repeated submission during one pending write must save exactly once.');
tree = render();
assert.equal(button(tree, '正在保存…').props.disabled, true);
assert.equal(button(tree, '取消').props.disabled, true);
assert.ok(nodes(tree).filter((node) => ['input', 'select', 'textarea'].includes(node.type)).every((node) => node.props.disabled), 'Pending save keeps its draft stable.');
reject(new Error('quota'));
await first;
tree = render();
assert.equal(button(tree, '保存到当前浏览器').props.disabled, false);
assert.ok(find(tree, (node) => node.props.role === 'alert' && node.props.children.includes('未能保存')));
const retry = find(tree, (node) => node.type === 'form').props.onSubmit(event);
assert.equal(writes, 2, 'Failed write unlocks retry and retains selected file.');
release(); await retry;
assert.equal(find(render(), (node) => node.type === 'form'), undefined);

vault.documents = [{ id: 'qa', title: 'QA fixture', category: 'Other', size: 10, mimeType: 'image/png' }];
vault.read = async () => { throw new Error('read failure'); };
tree = render(); await button(tree, '打开').props.onClick();
assert.ok(find(render(), (node) => node.props.role === 'alert' && node.props.children.includes('无法打开')));
vault.read = async () => undefined;
await button(render(), '打开').props.onClick();
assert.ok(find(render(), (node) => node.props.role === 'alert' && node.props.children.includes('暂时无法读取')));
vault.loading = true;
assert.ok(find(render(), (node) => node.type === 'strong' && node.props.children === '正在读取…'));
vault.loading = false; vault.error = 'unavailable';
assert.ok(find(render(), (node) => node.type === 'strong' && node.props.children === '当前浏览器存储不可用'));
console.log('Document interaction tests passed: single pending save, failure retry, read errors and honest storage status.');

// Synthetic file limits include the accepted boundary, unsupported format and empty file.
assert.equal(documentModel.validateDocumentFile({ type: 'image/png', size: 0 }), '文件为空，请选择其他文件。');
assert.equal(documentModel.validateDocumentFile({ type: 'text/plain', size: 1 }), '仅支持 PDF、JPG、PNG 和 WEBP 文件。');
assert.equal(documentModel.validateDocumentFile({ type: 'application/pdf', size: documentModel.MAX_DOCUMENT_BYTES }), null);
assert.equal(documentModel.validateDocumentFile({ type: 'application/pdf', size: documentModel.MAX_DOCUMENT_BYTES + 1 }), '每份资料不能超过 25 MB。');
vault.error = undefined;
const removals = [];
vault.remove = async (id) => { removals.push(id); };
const deleteButton = () => find(render(), (node) => node.props.className === 'document-delete');
deleteButton().props.onClick();
assert.equal(confirmMessage, '删除当前浏览器中的资料「QA fixture」？');
assert.deepEqual(removals, [], 'Cancel leaves the synthetic vault unchanged.');
confirmResult = true;
deleteButton().props.onClick();
assert.deepEqual(removals, ['qa'], 'Confirmation removes only the selected synthetic record.');
console.log('Chinese file validation and cancel/confirm deletion tests passed.');
