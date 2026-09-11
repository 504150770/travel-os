import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sourceRoots = ['app', 'components', 'features', 'hooks', 'lib', 'views'];
const extensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs'];

function collectFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory()
      ? collectFiles(target)
      : extensions.includes(path.extname(entry.name))
        ? [target]
        : [];
  });
}

const files = sourceRoots.flatMap((directory) => collectFiles(path.join(root, directory)));
const fileSet = new Set(files.map((file) => path.normalize(file)));

function resolveImport(fromFile, specifier) {
  if (!specifier.startsWith('.') && !specifier.startsWith('@/')) return null;
  const base = specifier.startsWith('@/')
    ? path.join(root, specifier.slice(2))
    : path.resolve(path.dirname(fromFile), specifier);
  const candidates = [
    base,
    ...extensions.map((extension) => `${base}${extension}`),
    ...extensions.map((extension) => path.join(base, `index${extension}`)),
  ];
  return (
    candidates
      .map((candidate) => path.normalize(candidate))
      .find((candidate) => fileSet.has(candidate)) ?? null
  );
}

const importPattern = /(?:import|export)\s+(?:[^'";]+?\s+from\s+)?['"]([^'"]+)['"]/g;
const graph = new Map();
for (const file of files) {
  const contents = fs.readFileSync(file, 'utf8');
  const dependencies = [];
  for (const match of contents.matchAll(importPattern)) {
    const resolved = resolveImport(file, match[1]);
    if (resolved) dependencies.push(resolved);
  }
  graph.set(path.normalize(file), dependencies);
}

const visiting = new Set();
const visited = new Set();
const stack = [];
const cycles = [];

function visit(file) {
  if (visiting.has(file)) {
    const index = stack.indexOf(file);
    cycles.push([...stack.slice(index), file]);
    return;
  }
  if (visited.has(file)) return;
  visiting.add(file);
  stack.push(file);
  for (const dependency of graph.get(file) ?? []) visit(dependency);
  stack.pop();
  visiting.delete(file);
  visited.add(file);
}

for (const file of files) visit(path.normalize(file));

const entry = path.join(root, 'components', 'travel-guide-v3.tsx');
const entryContents = fs.readFileSync(entry, 'utf8');
const entryLines = entryContents.split(/\r?\n/).length;
const problems = [];
if (entryLines > 200) problems.push(`TravelGuideV3 remains too large: ${entryLines} lines`);
if (/\buse(?:State|Effect|Memo|Callback|Reducer|Ref)\s*\(/.test(entryContents)) {
  problems.push('TravelGuideV3 still owns React state or effects');
}
if (cycles.length > 0) {
  problems.push(
    ...cycles.map(
      (cycle) =>
        `Circular dependency: ${cycle.map((file) => path.relative(root, file)).join(' -> ')}`,
    ),
  );
}

if (problems.length > 0) {
  console.error(problems.join('\n'));
  process.exit(1);
}

console.log(`Architecture audit passed: ${files.length} modules, ${entryLines} entry lines, 0 cycles.`);
