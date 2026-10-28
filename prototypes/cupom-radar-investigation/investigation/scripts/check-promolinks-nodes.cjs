const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..', '..', 'promolinks-review', 'n8n', 'nodes');
const files = fs.readdirSync(root).filter((f) => f.endsWith('.js')).sort();
const results = files.map((file) => {
  const code = fs.readFileSync(path.join(root, file), 'utf8');
  try {
    new vm.Script(`async function __n8n_node__() {\n${code}\n}`, { filename: file });
    return { file, status: 'syntax-ok-in-n8n-async-wrapper' };
  } catch (error) {
    return { file, status: 'syntax-error', message: error.message };
  }
});
const output = { repository: 'zHobbit/promolinks-ofertas-whatsapp', check: 'parse-only; node code wrapped as async n8n Code node; never executed', results };
console.log(JSON.stringify(output, null, 2));
if (results.some((r) => r.status !== 'syntax-ok-in-n8n-async-wrapper')) process.exitCode = 1;

