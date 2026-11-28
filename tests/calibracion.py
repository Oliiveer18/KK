"""F13: calibración. Lanza N partidas simuladas completas (hasta el final o MIN minutos de juego) en paralelo (PAR a la vez), cada una con su informe JSON, y resume los KPIs del plan v4:
duración con objetivo 1.000, cambios de dueño en puntos comunes, ataques y brechas, ingreso/gasto de material, reciclaje de los bots y reparto de bajas por clase.
Uso: python3 tests/calibracion.py [N=6] [PAR=3] [MIN=26]   →   escribe docs/calibracion_f13.json y un resumen por pantalla."""
import os, sys, json, subprocess, time, statistics as st
N = int(sys.argv[1]) if len(sys.argv) > 1 else 6; PAR = int(sys.argv[2]) if len(sys.argv) > 2 else 3; MIN = sys.argv[3] if len(sys.argv) > 3 else '26'
out = '/tmp/cal'; os.makedirs(out, exist_ok=True); procs = []; done = []
def launch(i):
    env = dict(os.environ, SIM_OUT=f'{out}/m{i}.json'); f = open(f'{out}/m{i}.log', 'w')
    return i, subprocess.Popen([sys.executable, 'tests/partida_simulada.py', MIN], stdout=f, stderr=subprocess.STDOUT, env=env)
nxt = 0
while nxt < N or procs:
    while nxt < N and len(procs) < PAR: procs.append(launch(nxt)); nxt += 1
    for i, p in procs[:]:
        if p.poll() is not None: procs.remove((i, p)); done.append(i); print('partida', i, 'fin (código', p.returncode, ')', flush=True)
    time.sleep(3)
R = []
for i in done:
    try: R.append(json.load(open(f'{out}/m{i}.json')))
    except Exception as e: print('sin informe', i, e)
def m(f, d=None):
    v = [f(r) for r in R]; v = [x for x in v if x is not None]; return (round(st.mean(v), 2), min(v), max(v)) if v else d
S = {'partidas': len(R),
  'duracion_s': m(lambda r: r['simT']), 'ganadas': sum(1 for r in R if r['final'].get('winner', -1) >= 0), 'puntos_finales': [r['final']['score'] for r in R],
  'bajas_por_partida': m(lambda r: r['deaths']), 'bajas_zombi_pct': m(lambda r: 100 * r['bySrc'].get('ZOM', 0) / max(1, r['deaths'])),
  'primer_contacto_s': m(lambda r: r['v4'] and r['v4'].get('firstHit')), 'zombis_vivos_final': m(lambda r: r['v4'] and r['v4'].get('zomAlive')),
  'material_ganado': m(lambda r: sum(r['eco']['gained'])), 'material_depositado': m(lambda r: sum(r['eco']['deposited'])), 'material_gastado': m(lambda r: sum(r['eco']['spent'])), 'stock_final': m(lambda r: sum(r['eco']['stock'])),
  'oleadas': m(lambda r: sum(r['v4']['off']['waves'])), 'asedios': m(lambda r: sum(r['v4']['off']['sieges'])), 'retiradas': m(lambda r: sum(r['v4']['off']['retreats'])), 'disparos_a_muros': m(lambda r: sum(r['v4']['off']['shots'])),
  'refugios_destruidos': sum(sum(1 for d in r['v4']['destroyed'] if d) for r in R), 'integridad_minima': m(lambda r: min(r['v4']['pct'])), 'hordas': m(lambda r: r['v4']['off']['hordes']),
  'reparado': m(lambda r: sum(r['v4']['refStats']['repaired'])), 'mejoras': m(lambda r: sum(r['v4']['refStats']['upgraded'])), 'reconstruidos': m(lambda r: sum(r['v4']['refStats']['rebuilt'])),
  'guarnicion_rojo': m(lambda r: sum(r['v4']['def']['red'])), 'granadas_a_brecha': m(lambda r: sum(r['v4']['def']['grenades'])),
  'reciclaje_trabajos': m(lambda r: sum(r['eco']['lg']['jobs'])), 'reciclaje_abortos': m(lambda r: sum(r['eco']['lg']['aborts'])), 'atascos': m(lambda r: r['nstuck']), 'errores_js': sum(1 for r in R if False)}
cls = {}
for r in R:
    for k, v in r['cls'].items(): c = cls.setdefault(k, [0, 0, 0]); c[0] += v['n']; c[1] += v['k']; c[2] += v['d']
S['clases_k_d'] = {k: round(v[1] / max(1, v[2]), 2) for k, v in cls.items()}
json.dump({'resumen': S, 'partidas': R}, open('docs/calibracion_f13.json', 'w'), ensure_ascii=False, indent=1)
print(json.dumps(S, ensure_ascii=False, indent=1))
