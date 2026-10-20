"""Copia el modelo (cadena.js) y las cuencas (cuencas.json) dentro de index.html, para que la app sea un solo archivo.
Uso: python3 modelo/armar.py   (desde la carpeta de la app)"""
import json, re, pathlib
raiz = pathlib.Path(__file__).resolve().parent
html = (raiz.parent / 'index.html').read_text()
cad = (raiz / 'cadena.js').read_text()
bloque = cad[cad.index('// <cadena>'):cad.index('// </cadena>') + len('// </cadena>')]
html = re.sub(r'// <cadena>.*?// </cadena>', lambda m: bloque, html, flags=re.S)
cu = [{k: v for k, v in c.items() if k not in ('maxKm2', 'salida')} for c in json.load(open(raiz / 'cuencas.json'))]
html = re.sub(r'/\* <cuencas> \*/.*?/\* </cuencas> \*/', lambda m: '/* <cuencas> */ const CUENCAS = ' + json.dumps(cu, ensure_ascii=False, separators=(',', ':')) + '; /* </cuencas> */', html, flags=re.S)
(raiz.parent / 'index.html').write_text(html)
print('index.html armado:', len(html) // 1024, 'KB')
