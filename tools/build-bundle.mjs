// Gera data/bundle.js a partir de data/*.json (alternativa em Node):  node tools/build-bundle.mjs
import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const files = ['maps', 'characters', 'enemies', 'items', 'skills', 'quests', 'dialogues', 'music'];
const data = {};
for (const f of files) {
  try { data[f] = JSON.parse(readFileSync(join(root, 'data', f + '.json'), 'utf8')); }
  catch (e) { console.error('Erro em data/' + f + '.json: ' + e.message); process.exit(1); }
}
const out = join(root, 'data', 'bundle.js');
writeFileSync(out, '/* GERADO AUTOMATICAMENTE por tools/build-bundle — não edite à mão. Edite os .json e rode o script de novo. */\nwindow.VAGALUME_DATA = ' + JSON.stringify(data) + ';\n');
console.log('data/bundle.js gerado (' + Math.round(statSync(out).size / 1024) + ' KB)');
