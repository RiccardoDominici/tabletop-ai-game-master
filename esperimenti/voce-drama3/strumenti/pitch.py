# Altezza media (f0) di ogni mp3, per controllare genere/età e distanza tra le voci.
import subprocess, sys, numpy as np
def f0(file):
    pcm = subprocess.run(['ffmpeg','-v','error','-i',file,'-ac','1','-ar','16000','-f','s16le','-'],capture_output=True).stdout
    x = np.frombuffer(pcm, dtype=np.int16).astype(np.float32)/32768
    sr=16000; n=640; hop=160; out=[]
    for i in range(0, len(x)-n, hop):
        w = x[i:i+n]*np.hanning(n)
        if np.sqrt(np.mean(w**2)) < 0.02: continue
        ac = np.correlate(w, w, 'full')[n-1:]
        lo, hi = sr//400, sr//60
        k = lo + np.argmax(ac[lo:hi])
        if ac[k] > 0.4*ac[0]: out.append(sr/k)
    a=np.array(out)
    return np.median(a) if len(a) else 0, len(a)
for f in sys.argv[1:]:
    m,n = f0(f)
    st = 12*np.log2(m/100) if m else 0
    print(f"{f:22s} f0 mediana {m:6.1f} Hz  ({st:+.1f} st rispetto a 100 Hz, {n} finestre)")
