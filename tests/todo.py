"""Lanza toda la batería de tests (menos las simulaciones largas) y resume qué pasa y qué falla. Uso: python3 tests/todo.py [filtro]"""
import subprocess, sys, glob, os, time
SALTAR = {'todo', 'partida_simulada', 'calibracion', 'chk', 'match'}
filtro = sys.argv[1] if len(sys.argv) > 1 else ''
res = []
for f in sorted(glob.glob('tests/*.py')):
    n = os.path.basename(f)[:-3]
    if n in SALTAR or filtro not in n: continue
    t = time.time()
    try:
        r = subprocess.run([sys.executable, f], capture_output=True, text=True, timeout=420); ok = r.returncode == 0; txt = r.stdout + r.stderr
    except subprocess.TimeoutExpired: ok = False; txt = 'TIMEOUT'
    fallos = [l for l in txt.splitlines() if l.startswith('FALLO ')][:3]
    res.append((n, ok, round(time.time() - t), fallos)); print(('OK   ' if ok else 'FALLA'), n, round(time.time() - t), 's', *fallos, flush=True)
print('\nresumen:', sum(1 for r in res if r[1]), 'de', len(res), 'pasan'); sys.exit(0 if all(r[1] for r in res) else 1)
