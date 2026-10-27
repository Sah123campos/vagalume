#!/usr/bin/env python3
"""Gera data/bundle.js a partir dos arquivos data/*.json.
O bundle permite abrir o jogo com dois cliques no index.html (file://),
onde o navegador bloqueia a leitura dos .json. Rode sempre que editar um JSON:
    python3 tools/build-bundle.py
"""
import json, os, sys
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
files = ['maps', 'characters', 'enemies', 'items', 'skills', 'quests', 'dialogues', 'music']
data = {}
for f in files:
    p = os.path.join(root, 'data', f + '.json')
    try:
        with open(p, encoding='utf-8') as fh:
            data[f] = json.load(fh)
    except Exception as e:
        sys.exit('Erro em data/%s.json: %s' % (f, e))
out = os.path.join(root, 'data', 'bundle.js')
with open(out, 'w', encoding='utf-8') as fh:
    fh.write('/* GERADO AUTOMATICAMENTE por tools/build-bundle — não edite à mão. Edite os .json e rode o script de novo. */\n')
    fh.write('window.VAGALUME_DATA = ')
    json.dump(data, fh, ensure_ascii=False, separators=(',', ':'))
    fh.write(';\n')
print('data/bundle.js gerado (%d KB)' % (os.path.getsize(out) // 1024))
