#!/usr/bin/env python3
"""Mide lo parecidas que son las variantes de un mismo sonido (para que no cambie el carácter del arma).
Uso: python3 tools/consistencia.py archivo1.wav archivo2.wav ...   (o sin argumentos: todos los grupos del manifiesto)
Compara: brillo (centroide espectral), reparto por bandas, decaimiento y sonoridad de la parte activa."""
import json, sys, wave
from pathlib import Path
import numpy as np
RAIZ = Path(__file__).resolve().parent.parent
BANDAS = [(0, 300), (300, 1000), (1000, 3000), (3000, 8000), (8000, 24000)]

def cargar(p):
    w = wave.open(str(p)); sr = w.getframerate()
    a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).reshape(-1, w.getnchannels()).mean(axis=1) / 32768
    return a, sr

def medir(a, sr):
    pk = np.abs(a).max(); k = int(np.argmax(np.abs(a) > pk * .01)); x = a[k:]
    seg = x[:int(sr * .12)]; X = np.abs(np.fft.rfft(seg * np.hanning(len(seg)))) ** 2; f = np.fft.rfftfreq(len(seg), 1 / sr)
    cent = float((f * X).sum() / X.sum()); tot = X.sum()
    bandas = [10 * np.log10(X[(f >= lo) & (f < hi)].sum() / tot + 1e-12) for lo, hi in BANDAS]
    w5 = int(sr * .005); env = np.sqrt(np.convolve(x * x, np.ones(w5) / w5, mode='same')); db = 20 * np.log10(env / pk + 1e-9)
    t30 = float(np.where(db > -30)[0][-1] / sr); act = x[env > pk * .03]
    rms = float(20 * np.log10(np.sqrt(np.mean(act ** 2)) + 1e-9)) if len(act) else -99
    return dict(cent=cent, bandas=bandas, t30=t30, rms=rms, pico=float(20 * np.log10(pk)))

def informe(nombres, medidas):
    c = np.array([m['cent'] for m in medidas]); t = np.array([m['t30'] for m in medidas]); r = np.array([m['rms'] for m in medidas])
    b = np.array([m['bandas'] for m in medidas])
    for n, m in zip(nombres, medidas):
        print(f"  {n:16s} brillo {m['cent']:6.0f} Hz  caída-30dB {m['t30']*1000:4.0f} ms  sonoridad {m['rms']:6.1f} dB  bandas {[round(v) for v in m['bandas']]}")
    dc = (c.max() - c.min()) / c.mean() * 100; dt = (t.max() - t.min()) / t.mean() * 100; dr = r.max() - r.min(); db_ = (b.max(axis=0) - b.min(axis=0)).max()
    ok = dc <= 25 and dt <= 35 and db_ <= 5
    print(f"  dispersión: brillo {dc:.0f} %, caída {dt:.0f} %, sonoridad {dr:.1f} dB (se iguala en el build), bandas {db_:.1f} dB -> {'CONSISTENTE' if ok else 'REVISAR'}")

if __name__ == '__main__':
    if len(sys.argv) > 1:
        ps = [Path(p) for p in sys.argv[1:]]; ms = [medir(*cargar(p)) for p in ps]; informe([p.stem for p in ps], ms)
    else:
        import re
        man = json.loads((RAIZ / 'assets/audio/manifest.json').read_text(encoding='utf-8')); grupos = {}
        for n, c in man.items():
            if not n.startswith('_'): grupos.setdefault(re.sub(r'_\d\d$', '', n), []).append((n, c))
        for g, L in sorted(grupos.items()):
            if len(L) > 1:
                print(g); informe([n for n, _ in L], [medir(*cargar(RAIZ / 'assets/audio' / c['src'])) for _, c in L])
