#!/usr/bin/env python3
"""Genera src/sonidos.js (audio incrustado) e index.html (autocontenido).
Uso: python3 tools/build.py
- Procesa assets/audio/manifest.json: mono, recorte, fundido, puerta de ruido y MP3.
- Variantes de un mismo sonido (ID_01, ID_02...): se igualan en tono (EQ suave), sonoridad y duración de la cola,
  para que el arma no cambie de carácter entre disparos. Se imprime un informe antes y después.
- Escribe src/sonidos.js con SOUND_DATA = { "P1_shot": [base64, ...], ... }.
- Escribe index.html sustituyendo las etiquetas de three.js, sonidos.js, partida.js y zombis.js por su contenido.
"""
import base64, json, re, subprocess, sys, wave
from pathlib import Path
import numpy as np

RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))
import consistencia as cons

AUDIO = RAIZ / 'assets' / 'audio'
TAG_THREE = '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js" crossorigin="anonymous"></script>'
TAG_SONIDOS = '<script src="sonidos.js"></script>'
TAG_OBJETOS = '<script src="objetos.js"></script>'
TAG_MAPA = '<script src="mapa.js"></script>'
TAG_COMP = '<script src="composiciones.js"></script>'
TAG_MAPAD = '<script src="mapa_distrito.js"></script>'
TAG_PARTIDA = '<script src="partida.js"></script>'
TAG_ZOMBIS = '<script src="zombis.js"></script>'
TAG_ESCUADRAS = '<script src="escuadras.js"></script>'

def leer_wav(p):
    with wave.open(str(p)) as w:
        n, sr, ch, sw = w.getnframes(), w.getframerate(), w.getnchannels(), w.getsampwidth()
        raw = w.readframes(n)
    if sw != 2:
        raise SystemExit(f'{p.name}: solo se admite WAV de 16 bits')
    a = np.frombuffer(raw, dtype=np.int16).astype(np.float64) / 32768.0
    return a.reshape(-1, ch).mean(axis=1), sr

def puerta(x, sr, umbral_db):
    """Puerta de ruido suave: baja el siseo de fondo entre golpes y en la cola (umbral en dB respecto al pico)."""
    if not umbral_db or len(x) < 64:
        return x
    pico = np.abs(x).max()
    if pico <= 0:
        return x
    v = max(1, int(sr * 0.005))
    env = np.sqrt(np.convolve(x * x, np.ones(v) / v, mode='same'))
    env_db = 20 * np.log10(env / pico + 1e-9)
    g = 10 ** (np.clip((env_db - umbral_db) * 2.0, -40.0, 0.0) / 20.0)     # 3:1 por debajo del umbral, hasta -40 dB
    a_att, a_rel = np.exp(-1 / (sr * 0.002)), np.exp(-1 / (sr * 0.04))
    y = np.empty_like(g); prev = g[0]
    for i in range(len(g)):                                                 # abre rápido (2 ms), cierra despacio (40 ms)
        c = a_att if g[i] > prev else a_rel
        prev = c * prev + (1 - c) * g[i]; y[i] = prev
    return x * y

def procesar(cfg):
    """Recorta, funde y limpia; devuelve (señal sin normalizar, frecuencia)."""
    x, sr = leer_wav(AUDIO / cfg['src'])
    if cfg.get('apilar'):                                                        # 'apilar': [[retraso s, ganancia, tono]] superpone copias del mismo sonido (p. ej. varios casquillos)
        L_ = len(x); out = np.zeros(L_ + int(sr * max(c[0] for c in cfg['apilar'])) + int(sr * 0.2))
        for r_, g_, t_ in cfg['apilar']:
            idx = np.arange(0, L_ - 1, t_); y_ = np.interp(idx, np.arange(L_), x) * g_; o_ = int(sr * r_); out[o_:o_ + len(y_)] += y_
        x = out
    for a_, b_ in sorted(cfg.get('quitar', []), reverse=True):                 # 'quitar': [[desde, hasta]] elimina huecos de silencio (segundos)
        i, j = int(sr * a_), int(sr * b_); nx = int(sr * 0.008)
        izq, der = x[:i].copy(), x[j:].copy()
        izq[-nx:] *= np.linspace(1, 0, nx); der[:nx] *= np.linspace(0, 1, nx)
        x = np.concatenate([izq, der])
    x = x[int(sr * cfg.get('inicio', 0)):]                                   # 'inicio': descarta los primeros segundos
    x = x[:min(len(x), int(sr * cfg.get('trim', len(x) / sr)))].copy()
    if cfg.get('inicio'):
        nin = int(sr * 0.004); x[:nin] *= np.linspace(0.0, 1.0, nin)
    nf = 0 if cfg.get('bucle') else min(len(x), int(sr * cfg.get('fade', 0.02)))
    if nf > 0:
        x[-nf:] *= np.linspace(1.0, 0.0, nf)
    if cfg.get('bucle'):                                                       # bucle sin costura: la cola se mezcla con el principio
        xf = int(sr * cfg.get('cruce', 0.25)); t = np.linspace(0.0, 1.0, xf)
        cab = x[:xf] * np.sin(t * np.pi / 2) + x[-xf:] * np.cos(t * np.pi / 2)
        return np.concatenate([cab, x[xf:len(x) - xf]]), sr
    return puerta(x, sr, cfg.get('gate', -42.0)), sr

def curva_espectral(x, sr, n):
    """Espectro medio (dB) de la parte activa, suavizado a ~1/3 de octava, en n puntos de frecuencia."""
    pk = np.abs(x).max(); k = int(np.argmax(np.abs(x) > pk * .01)); seg = x[k:k + int(sr * .15)]
    seg = np.pad(seg, (0, max(0, n * 2 - len(seg))))[:n * 2]
    X = np.abs(np.fft.rfft(seg * np.hanning(len(seg)))) ** 2; f = np.fft.rfftfreq(len(seg), 1 / sr)
    out = np.empty_like(X)
    for i, fi in enumerate(f):
        m = (f >= fi / 1.12) & (f <= fi * 1.12) if fi > 0 else (f == 0)
        out[i] = X[m].mean()
    return 10 * np.log10(out + 1e-14), f

def igualar_espectro(xs, sr, limite_db=4.0):
    """Acerca el timbre de cada variante al promedio del grupo con un EQ suave (limitado a +/- limite_db)."""
    n = 4096; curvas = []
    for x in xs:
        c, f = curva_espectral(x, sr, n); curvas.append(c)
    media = np.mean(curvas, axis=0); salida = []
    for x, c in zip(xs, curvas):
        corr = np.clip(media - c, -limite_db, limite_db)
        corr[(f < 80) | (f > 14000)] = 0.0                                   # no tocar los extremos
        corr = np.convolve(corr, np.ones(9) / 9, mode='same')
        N = 1 << int(np.ceil(np.log2(len(x) + n)))
        H = np.interp(np.fft.rfftfreq(N, 1 / sr), f, 10 ** (corr / 20.0))
        salida.append(np.fft.irfft(np.fft.rfft(x, N) * H, N)[:len(x)])
    return salida

def acortar_cola(xs, sr):
    """Si una variante tarda claramente más que las demás en caer 30 dB, le aplica una caída suave hasta igualarla."""
    t30 = [cons.medir(x, sr)['t30'] for x in xs]
    objetivo = float(np.median(t30)) * 1.15; salida = []
    for x, t in zip(xs, t30):
        if t <= objetivo * 1.1:
            salida.append(x); continue
        pk = np.abs(x).max(); k0 = int(np.argmax(np.abs(x) > pk * .5)); t_ax = np.maximum(np.arange(len(x)) - k0, 0) / sr
        mejor = x
        for kk in np.linspace(2, 60, 30):
            y = x * np.exp(-kk * t_ax)
            if cons.medir(y, sr)['t30'] <= objetivo:
                mejor = y; break
        salida.append(mejor)
    return salida

def igualar_sonoridad(xs, sr, pico_db):
    """Misma sonoridad (parte activa) para todas las variantes y un único factor para que la más fuerte llegue al pico objetivo."""
    r = [cons.medir(x, sr)['rms'] for x in xs]; obj = float(np.mean(r))
    xs = [x * 10 ** ((obj - ri) / 20.0) for x, ri in zip(xs, r)]
    g = (10 ** (pico_db / 20.0)) / max(np.abs(x).max() for x in xs)
    return [x * g for x in xs]

def a_mp3(x, sr):
    pcm = (np.clip(x, -1, 1) * 32767).astype('<i2').tobytes()
    r = subprocess.run(['ffmpeg', '-v', 'error', '-f', 's16le', '-ar', str(sr), '-ac', '1', '-i', '-',
                        '-c:a', 'libmp3lame', '-b:a', '128k', '-f', 'mp3', '-'], input=pcm, stdout=subprocess.PIPE, check=True)
    return r.stdout

def a_wav(x, sr):
    import io
    b = io.BytesIO()
    with wave.open(b, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((np.clip(x, -1, 1) * 32767).astype('<i2').tobytes())
    return b.getvalue()

def main():
    man = json.loads((AUDIO / 'manifest.json').read_text(encoding='utf-8'))
    grupos = {}
    for nombre, cfg in sorted(man.items()):
        if not nombre.startswith('_'):
            grupos.setdefault(re.sub(r'_\d\d$', '', nombre), []).append((nombre, cfg))
    datos = {}
    for base, L in grupos.items():
        proc = [procesar(c) for _, c in L]; sr = proc[0][0 + 1]; xs = [p[0] for p in proc]
        pico = min(c.get('peak', -1.0) for _, c in L)
        if len(xs) > 1:
            print(f'{base}: antes -> ' + ', '.join(f"{n[-2:]}: {cons.medir(x, sr)['cent']:.0f}Hz/{cons.medir(x, sr)['t30']*1000:.0f}ms" for (n, _), x in zip(L, xs)))
            xs = acortar_cola(xs, sr); xs = igualar_sonoridad(xs, sr, pico)
            print(f'{base}: después -> ' + ', '.join(f"{n[-2:]}: {cons.medir(x, sr)['cent']:.0f}Hz/{cons.medir(x, sr)['t30']*1000:.0f}ms/{cons.medir(x, sr)['rms']:.1f}dB" for (n, _), x in zip(L, xs)))
        else:
            xs = [xs[0] * (10 ** (pico / 20.0)) / max(np.abs(xs[0]).max(), 1e-9)]
        enc = a_wav if any(c.get('bucle') for _, c in L) else a_mp3                # los bucles van sin pérdida (el MP3 deja huecos)
        datos[base] = [base64.b64encode(enc(x, sr)).decode('ascii') for x in xs]
    js = '/* generado por tools/build.py a partir de assets/audio: no editar a mano */\nconst SOUND_DATA = ' + json.dumps(datos) + ';\n'
    (RAIZ / 'src' / 'sonidos.js').write_text(js, encoding='utf-8')
    fuente = (RAIZ / 'src' / 'prototipo.html').read_text(encoding='utf-8')
    for tag in (TAG_THREE, TAG_SONIDOS, TAG_MAPA, TAG_COMP, TAG_MAPAD, TAG_PARTIDA, TAG_ZOMBIS, TAG_ESCUADRAS):
        if tag not in fuente:
            raise SystemExit('Falta la etiqueta en src/prototipo.html: ' + tag)
    three = (RAIZ / 'src' / 'three.min.r128.js').read_text(encoding='utf-8')
    partida = (RAIZ / 'src' / 'partida.js').read_text(encoding='utf-8')
    mapa = (RAIZ / 'src' / 'mapa.js').read_text(encoding='utf-8')
    mapad = (RAIZ / 'src' / 'mapa_distrito.js').read_text(encoding='utf-8')
    comp = (RAIZ / 'src' / 'composiciones.js').read_text(encoding='utf-8')
    if '</script' in comp:
        raise SystemExit('src/composiciones.js no puede contener </script')
    if '</script' in mapa or '</script' in mapad:
        raise SystemExit('src/mapa*.js no puede contener </script')
    zombis = (RAIZ / 'src' / 'zombis.js').read_text(encoding='utf-8')
    escuadras = (RAIZ / 'src' / 'escuadras.js').read_text(encoding='utf-8')
    if '</script' in escuadras:
        raise SystemExit('src/escuadras.js no puede contener </script')
    objetos = (RAIZ / 'src' / 'objetos.js').read_text(encoding='utf-8')
    if '</script' in objetos:
        raise SystemExit('src/objetos.js no puede contener </script')
    if '</script' in zombis:
        raise SystemExit('src/zombis.js no puede contener </script')
    if '</script' in partida:
        raise SystemExit('src/partida.js no puede contener </script')
    salida = fuente.replace(TAG_THREE, '<script>' + three + '</script>').replace(TAG_SONIDOS, '<script>' + js + '</script>').replace(TAG_OBJETOS, '<script>' + objetos + '</script>').replace(TAG_MAPA, '<script>' + mapa + '</script>').replace(TAG_COMP, '<script>' + comp + '</script>').replace(TAG_MAPAD, '<script>' + mapad + '</script>').replace(TAG_PARTIDA, '<script>' + partida + '</script>').replace(TAG_ZOMBIS, '<script>' + zombis + '</script>').replace(TAG_ESCUADRAS, '<script>' + escuadras + '</script>')
    (RAIZ / 'index.html').write_text(salida, encoding='utf-8')
    print(f'sonidos.js {len(js)/1024:.0f} KB, index.html {len(salida)/1024:.0f} KB')

if __name__ == '__main__':
    main()
