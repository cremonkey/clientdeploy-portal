"""Synthesizes the showreel soundtrack: 120 BPM music bed + SFX cued to scene.html.

Every sound is generated from scratch (no samples), so the track is royalty-free.
Cue times mirror the constants in scene.html — keep them in sync.
Usage: python3 audio.py out/audio.wav
"""
import sys
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve
from scipy.io import wavfile

SR = 48000
DUR = 30.0
N = int(SR * DUR)
rng = np.random.default_rng(7)

music = np.zeros((N, 2))
sfx = np.zeros((N, 2))
duck = np.ones(N)  # sidechain gain applied to bass/pad


# ---------------------------------------------------------------- primitives
def tvec(d):
    return np.arange(int(d * SR)) / SR


def noise(d):
    return rng.uniform(-1, 1, int(d * SR))


def filt(x, kind, f, order=2):
    f = np.atleast_1d(f)
    ny = SR / 2
    if kind == 'band':
        sos = butter(order, [max(20, f[0]) / ny, min(ny - 100, f[1]) / ny], 'band', output='sos')
    else:
        sos = butter(order, min(ny - 100, max(20, f[0])) / ny, kind, output='sos')
    return sosfilt(sos, x)


def sweep_band(x, f0, f1, q=0.35, block=512):
    """Band-pass with a centre frequency gliding exponentially f0 -> f1."""
    out = np.zeros_like(x)
    n = len(x)
    for i in range(0, n, block):
        k = i / max(1, n - 1)
        fc = f0 * (f1 / f0) ** k
        seg = x[max(0, i - 2048):i + block]
        y = filt(seg, 'band', [fc * (1 - q), fc * (1 + q)])
        out[i:i + block] = y[-len(x[i:i + block]):]
    return out


def env_exp(d, decay):
    return np.exp(-tvec(d) * decay)


def adsr(n, a, r):
    e = np.ones(n)
    na, nr = int(a * SR), int(r * SR)
    if na:
        e[:na] = np.linspace(0, 1, na)
    if nr:
        e[-nr:] *= np.linspace(1, 0, nr)
    return e


def place(bus, t, sig, gain=1.0, pan=0.0):
    i = int(t * SR)
    if i >= N or len(sig) == 0:
        return
    sig = sig[:N - i] * gain
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    bus[i:i + len(sig), 0] += sig * l * 1.414
    bus[i:i + len(sig), 1] += sig * r * 1.414


def sine_glide(d, f0, f1, curve=6.0):
    t = tvec(d)
    f = f1 + (f0 - f1) * np.exp(-t * curve)
    return np.sin(2 * np.pi * np.cumsum(f) / SR)


def saw(freq, d):
    t = tvec(d)
    return 2 * ((t * freq) % 1) - 1


# ---------------------------------------------------------------- instruments
def kick(punch=1.0):
    d = 0.45
    body = sine_glide(d, 170, 46, 28) * env_exp(d, 7.5)
    click = filt(noise(0.012), 'high', 2500) * np.linspace(1, 0, int(0.012 * SR))
    body[:len(click)] += click * 0.5 * punch
    return np.tanh(body * 1.6)


def clap():
    d = 0.35
    n = noise(d)
    e = np.zeros(len(n))
    for off in (0, 0.011, 0.022):
        i = int(off * SR)
        e[i:] += np.exp(-np.arange(len(n) - i) / SR * (60 if off < 0.02 else 14))
    return filt(n * e, 'band', [900, 4200]) * 0.9


def snare(pitch=1.0):
    d = 0.22
    tone = np.sin(2 * np.pi * 190 * pitch * tvec(d)) * env_exp(d, 30)
    nz = filt(noise(d), 'band', [1500 * pitch, 8000]) * env_exp(d, 18)
    return tone * 0.5 + nz * 0.8


def hat(open_=False):
    d = 0.25 if open_ else 0.05
    return filt(noise(d), 'high', 7500) * env_exp(d, 12 if open_ else 80) * 0.6


def impact(size=1.0):
    d = 2.2
    boom = sine_glide(d, 110, 32, 5) * env_exp(d, 2.2 / size)
    crack = filt(noise(0.5), 'band', [300, 6000]) * env_exp(0.5, 9)
    sig = np.tanh(boom * 2.2) * 0.9
    sig[:len(crack)] += crack * 0.55 * size
    return sig


def whoosh(d=0.5, f0=300, f1=4000, peak=0.6):
    x = sweep_band(noise(d), f0, f1, 0.45)
    t = np.linspace(0, 1, len(x))
    e = np.where(t < peak, (t / peak) ** 2, ((1 - t) / (1 - peak)) ** 1.5)
    return x * e * 2.2


def riser(d, f0=180, f1=1400):
    t = tvec(d)
    k = t / d
    tone = np.sin(2 * np.pi * np.cumsum(f0 * (f1 / f0) ** k) / SR)
    tone += 0.5 * np.sin(2 * np.pi * np.cumsum(f0 * 1.5 * (f1 / f0) ** k) / SR)
    nz = sweep_band(noise(d), 400, 9000, 0.6)
    return (tone * 0.25 + nz * 1.2) * k ** 2.2


def rev_cymbal(d=1.0):
    x = filt(noise(d), 'high', 5000) * env_exp(d, 4)
    return x[::-1] * 0.9


def tick(f=2600, d=0.018):
    x = filt(noise(d), 'band', [f * 0.7, f * 1.4]) * np.linspace(1, 0, int(d * SR)) ** 2
    return x * 1.4


def blip(f, d=0.07, glide=1.0):
    return sine_glide(d, f, f * glide, 30) * env_exp(d, 45)


def pop(f0=420, f1=980):
    d = 0.12
    t = tvec(d)
    f = f0 + (f1 - f0) * (1 - np.exp(-t * 60))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(d, 30)


def bell(f, d=1.6, bright=1.0):
    t = tvec(d)
    x = np.zeros(len(t))
    for ratio, amp, dec in ((1, 1, 2.2), (2.0, 0.45, 3.5), (2.76, 0.35 * bright, 5), (5.4, 0.2 * bright, 8), (8.9, 0.1 * bright, 12)):
        x += amp * np.sin(2 * np.pi * f * ratio * t) * np.exp(-t * dec)
    x[:int(0.004 * SR)] *= np.linspace(0, 1, int(0.004 * SR))
    return x * 0.35


def clunk():
    d = 0.6
    t = tvec(d)
    thud = sine_glide(d, 140, 55, 25) * np.exp(-t * 14)
    metal = sum(a * np.sin(2 * np.pi * f * t) * np.exp(-t * dcy)
                for f, a, dcy in ((612, .5, 16), (1377, .35, 20), (2190, .25, 26), (3310, .15, 30)))
    click = filt(noise(0.01), 'high', 3000) * np.linspace(1, 0, int(0.01 * SR))
    out = thud * 1.1 + metal * 0.6
    out[:len(click)] += click * 0.8
    return out


def glitch_burst(d=0.2, seed=0):
    r = np.random.default_rng(seed)
    out = np.zeros(int(d * SR))
    i = 0
    while i < len(out):
        L = int(r.uniform(0.008, 0.03) * SR)
        f = r.choice([180, 420, 880, 1650, 3200])
        seg = np.sign(np.sin(2 * np.pi * f * np.arange(L) / SR))
        seg = np.round(seg * r.uniform(0.2, 1) * 4) / 4
        out[i:i + L] = seg[:len(out) - i] * (r.uniform() > 0.2)
        i += L
    return filt(out, 'low', 7000) * 0.35


def zap_down(d=0.35, f0=2400, f1=40):
    t = tvec(d)
    f = f1 + (f0 - f1) * np.exp(-t * 14)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 6) * 0.6


def buzz(d=0.18):
    t = tvec(d)
    x = np.sign(np.sin(2 * np.pi * 110 * t)) * 0.5 + np.sign(np.sin(2 * np.pi * 117 * t)) * 0.5
    return filt(x, 'low', 2500) * np.exp(-t * 14) * 0.5


def ping(f1, f2):
    a = bell(f1, 0.7, 0.4)
    b = bell(f2, 0.9, 0.4)
    out = np.zeros(len(b) + int(0.08 * SR))
    out[:len(a)] += a
    out[int(0.08 * SR):] += b
    return out


def shimmer(d=0.6):
    return sweep_band(noise(d), 3000, 12000, 0.3) * np.sin(np.linspace(0, np.pi, int(d * SR))) * 1.4


# ---------------------------------------------------------------- music
def note_hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


BPM, BEAT = 120, 0.5
CHORDS = [  # (bass root midi, pad chord midis) Am - F - C - G, one per bar (2s)
    (33, [57, 60, 64, 69]),
    (29, [53, 57, 60, 65]),
    (36, [55, 60, 64, 67]),
    (31, [55, 59, 62, 67]),
]


def chord_at(t):
    return CHORDS[int(max(0, t - 6.0) // 2.0) % 4] if t >= 6.0 else CHORDS[0]


def pad_note(m, d, bright=1200):
    f = note_hz(m)
    x = saw(f * 0.997, d) + saw(f * 1.004, d) + 0.5 * saw(f * 2.001, d)
    x = filt(x, 'low', bright)
    return x * adsr(len(x), 0.25, 0.5) * 0.08


def build_music():
    # opening drone (Am) swelling into the drop
    for m in CHORDS[0][1]:
        place(music, 0.0, pad_note(m, 6.0, 900) * np.linspace(0.6, 1.0, int(6.0 * SR)), 1.8, pan=(m % 3 - 1) * 0.3)
    # sub heartbeat under the pulsing dot
    for tb in (0.1, 0.6):
        place(music, tb, sine_glide(0.4, 90, 45, 12) * env_exp(0.4, 9), 0.45)
    # build (3–6s): four-on-floor that thickens, accelerating snare roll
    for i in range(6):
        place(music, 3.0 + i * BEAT, kick(0.6), 0.55 + i * 0.05)
    t = 4.0
    while t < 5.875:
        step = 0.25 if t < 5.0 else (0.125 if t < 5.5 else 0.0625)
        place(music, t, snare(1 + (t - 4) * 0.25), 0.18 + (t - 4) * 0.18, pan=0.1)
        t += step
    # groove 6.0 – 28.0
    t = 6.0
    while t < 28.0 - 1e-6:
        beat_i = int(round((t - 6.0) / BEAT))
        breakdown = 13.5 <= t < 17.5
        if not breakdown or beat_i % 4 == 0:
            place(music, t, kick(), 0.95)
            d = np.ones(int(0.3 * SR))
            d *= 1 - 0.75 * np.exp(-np.arange(len(d)) / SR * 11)
            i0 = int(t * SR)
            duck[i0:i0 + len(d)] = np.minimum(duck[i0:i0 + len(d)], d[:N - i0])
        if beat_i % 2 == 1 and not breakdown:
            place(music, t, clap(), 0.5, pan=0.05)
        for s in range(4):  # 16th hats
            ts = t + s * BEAT / 4
            accent = 1.0 if s == 2 else 0.45
            place(music, ts, hat(open_=(s == 2 and beat_i % 4 == 3)), 0.35 * accent, pan=0.35 if s % 2 else -0.2)
        t += BEAT
    # bass: 8th-note root pulse with octave pops, lowpassed in the breakdown
    t = 6.0
    while t < 28.0 - 1e-6:
        root, pad = chord_at(t)
        eighth = int(round((t - 6.0) / (BEAT / 2)))
        m = root + (12 if eighth % 4 == 3 else 0)
        d = BEAT / 2 * 0.9
        f = note_hz(m + 12)
        x = np.sin(2 * np.pi * f * tvec(d)) + 0.35 * filt(saw(f, d), 'low', 500 if 13.5 <= t < 17.5 else 1400)
        place(music, t, np.tanh(x * 1.5) * adsr(len(x), 0.004, 0.03) * 0.34, 1.0, 0)
        t += BEAT / 2
    # pads per bar (with sidechain later)
    for b in range(11):
        tb = 6.0 + b * 2.0
        _, pad = CHORDS[b % 4]
        for j, m in enumerate(pad):
            place(music, tb, pad_note(m, 2.05, 2200 if not (13.5 <= tb < 17.5) else 900), 0.8, pan=(j - 1.5) * 0.35)
    # arp lead over the pricing section (25–28)
    for k, tt in enumerate(np.arange(24.5, 28.0, 0.125)):
        _, pad = chord_at(tt)
        m = pad[[0, 2, 1, 3, 2, 1][k % 6]] + 12
        place(music, tt, bell(note_hz(m), 0.3, 0.5) * 0.5, 0.35, pan=0.4 * np.sin(k))
    # fill into the finale
    for i, tt in enumerate(np.arange(27.5, 28.0, 0.0625)):
        place(music, tt, snare(1 + i * 0.06), 0.18 + i * 0.03, pan=-0.1)
    # final chord ringing out
    for j, m in enumerate([45, 57, 60, 64, 69, 76]):
        place(music, 28.0, pad_note(m, 2.0, 3000) * np.linspace(1, 0.0, int(2.0 * SR)) ** 0.5, 1.2, pan=(j - 2.5) * 0.25)


# ---------------------------------------------------------------- SFX cues
CMD = '$ clientdeploy ship acme-store'
TYPE0, TYPE_DT = 1.05, 0.035
LOG0, LOG_DT, SCAN0, SCAN_DT = 13.55, 0.12, 15.0, 0.1
SECRET_LINES = [2, 4, 5, 7, 9]


def build_sfx():
    # S1 — cold open
    place(sfx, 0.42, whoosh(0.6, 200, 3000, 0.7), 0.35)
    for i, ch in enumerate(CMD):
        place(sfx, TYPE0 + i * TYPE_DT, tick(2200 + rng.uniform(-500, 700), 0.02), 0.9 if ch != ' ' else 1.2,
              pan=rng.uniform(-0.2, 0.2))
    place(sfx, 2.35, tick(1400, 0.04), 0.9)
    place(sfx, 2.45, blip(1760, 0.08), 0.15)
    place(sfx, 2.62, glitch_burst(0.35, 1), 0.7)
    place(sfx, 2.45, riser(0.5, 300, 2000), 0.5)
    place(sfx, 2.95, impact(0.5), 0.45)
    # S2 — kinetic type
    place(sfx, 3.0, riser(2.9, 150, 1600), 0.55)
    place(sfx, 5.0, rev_cymbal(0.95), 0.55)
    place(sfx, 3.0, whoosh(0.35, 800, 6000, 0.3), 0.2)
    for tw, ts in ((3.25, 3.625), (3.875, 4.25), (4.5, 4.875)):
        place(sfx, tw - 0.12, whoosh(0.2, 600, 5000, 0.8), 0.45, pan=-0.3)
        place(sfx, tw, kick(1.5), 0.6)
        place(sfx, tw, clap(), 0.35)
        place(sfx, ts, sweep_band(noise(0.12), 8000, 900, 0.5) * env_exp(0.12, 20) * 3, 0.55, pan=0.3)  # slash
        place(sfx, ts, glitch_burst(0.12, int(ts * 10)), 0.5)
        place(sfx, ts, impact(0.35), 0.35)
    place(sfx, 5.125, tick(3000, 0.03), 0.6)
    place(sfx, 5.375, impact(0.6), 0.55)
    place(sfx, 5.375, shimmer(0.5), 0.5)
    place(sfx, 5.72, whoosh(0.3, 300, 6000, 0.95), 0.6)
    # S3 — THE DROP
    place(sfx, 6.0, impact(1.4), 1.0)
    place(sfx, 6.0, filt(noise(1.8), 'high', 3500) * env_exp(1.8, 2.6), 0.5)  # crash
    place(sfx, 6.0, bell(note_hz(81), 2.5), 0.45)
    for i in range(12):
        place(sfx, 6.45 + i * 0.03, blip(note_hz(84 + [0, 3, 7, 10][i % 4]), 0.06), 0.07, pan=-0.6 + i * 0.1)
    place(sfx, 7.0, whoosh(0.7, 500, 3000, 0.4), 0.2)
    place(sfx, 7.35, shimmer(0.55), 0.35)
    place(sfx, 7.95, riser(0.55, 400, 3000), 0.55)
    place(sfx, 8.05, whoosh(0.5, 200, 7000, 0.9), 0.7)
    # S4 — one-click deploy
    place(sfx, 8.3, whoosh(0.45, 400, 2500, 0.3), 0.45, pan=0.5)
    place(sfx, 8.6, tick(1800, 0.03), 0.3)
    place(sfx, 8.9, whoosh(0.55, 800, 1500, 0.5) * 0.4, 0.2, pan=0.6)
    place(sfx, 9.5, tick(3200, 0.012), 1.0)
    place(sfx, 9.5, blip(900, 0.05, 0.6), 0.4)
    place(sfx, 9.62, riser(2.35, 120, 700), 0.3)
    for k, nt in enumerate((9.8, 10.5, 11.2, 11.9)):
        place(sfx, nt, pop(note_hz(72 + [0, 4, 7, 12][k]) * 0.6, note_hz(72 + [0, 4, 7, 12][k])), 0.45, pan=-0.3 + k * 0.2)
        place(sfx, nt + 0.08, tick(4200, 0.02), 0.3)
    for k, m in enumerate((81, 85, 88, 93)):  # success arpeggio
        place(sfx, 12.0 + k * 0.06, bell(note_hz(m), 1.4), 0.5, pan=-0.2 + k * 0.15)
    place(sfx, 12.0, impact(0.7), 0.6)
    for i in range(30):  # confetti crackle
        place(sfx, 12.0 + rng.uniform(0, 1.2), tick(rng.uniform(4000, 9000), 0.008), 0.25 * rng.uniform(0.3, 1), pan=rng.uniform(-0.8, 0.8))
    place(sfx, 12.95, whoosh(0.45, 300, 6000, 0.85), 0.7, pan=-0.4)
    # S5 — logs
    for i in range(11):
        place(sfx, LOG0 + i * LOG_DT, blip(note_hz(88 + rng.integers(-5, 5)), 0.04), 0.12, pan=rng.uniform(-0.4, 0.4))
    scan_d = 11 * SCAN_DT + 0.15
    t = tvec(scan_d)
    hum = (np.sin(2 * np.pi * 220 * t + 2 * np.sin(2 * np.pi * 7 * t)) * 0.4 + filt(noise(scan_d), 'band', [2500, 5000]) * 0.5)
    place(sfx, SCAN0 - 0.05, hum * adsr(len(hum), 0.05, 0.1), 0.25)
    for i in SECRET_LINES:
        tr = SCAN0 + i * SCAN_DT + 0.05
        place(sfx, tr, glitch_burst(0.09, i * 3), 0.6, pan=-0.3)
        place(sfx, tr, clunk()[:int(0.25 * SR)], 0.3)
    place(sfx, 13.7, tick(1500, 0.03), 0.3)
    place(sfx, 16.15, impact(0.55), 0.55)
    place(sfx, 16.15, shimmer(0.5), 0.3)
    place(sfx, 17.12, zap_down(0.4), 0.7)
    place(sfx, 17.35, glitch_burst(0.15, 99), 0.4)
    # S6 — trust rings
    place(sfx, 17.5, impact(0.9), 0.8)
    place(sfx, 17.6, whoosh(0.7, 200, 1500, 0.5), 0.3)
    for k, lt in enumerate((18.2, 18.7, 19.2)):
        place(sfx, lt, clunk(), 0.75, pan=(k - 1) * 0.3)
        place(sfx, lt + 0.05, bell(note_hz(76 + k * 3), 0.6, 0.3), 0.15)
    for k, (t0, good) in enumerate(((19.35, 0), (19.5, 0), (19.65, 0), (19.8, 1))):
        place(sfx, t0, whoosh(0.45, 1500, 300 if not good else 5000, 0.9), 0.35, pan=[-0.7, 0.7, -0.4, 0.5][k])
        if not good:
            place(sfx, t0 + 0.45, buzz(), 0.8, pan=[-0.5, 0.5, -0.3][k])
            place(sfx, t0 + 0.45, tick(1200, 0.03), 0.6)
    for k, m in enumerate((81, 88, 93)):
        place(sfx, 20.25 + k * 0.05, bell(note_hz(m), 1.2), 0.45)
    place(sfx, 20.25, impact(0.6), 0.55)
    place(sfx, 20.45, whoosh(0.6, 3000, 300, 0.5), 0.45)
    for d in range(5):
        place(sfx, 20.6 + d * 0.1, pop(300 + d * 90, 700 + d * 160), 0.3, pan=(-1) ** d * 0.3)
    # S7 — feature panels
    for k, tp in enumerate((21.5, 22.25, 23.0, 23.75)):
        place(sfx, tp - 0.1, whoosh(0.3, 500, 7000, 0.7), 0.6, pan=0.6)
        place(sfx, tp, impact(0.4), 0.45)
    place(sfx, 21.45, glitch_burst(0.1, 5), 0.4)
    for tb in (21.58, 21.645, 21.73, 21.875):
        place(sfx, tb, blip(1000, 0.09), 0.25)
    tt = tvec(0.6)
    rs = np.sin(2 * np.pi * np.cumsum(300 + 900 * (tt / 0.6) ** 2) / SR) * 0.2 * adsr(len(tt), 0.02, 0.05)
    place(sfx, 22.3, rs, 0.35)
    place(sfx, 22.9, bell(note_hz(88), 0.9), 0.45)
    for i in range(10):
        place(sfx, 23.05 + i * 0.04, tick(2000 + i * 200, 0.015), 0.45)
    place(sfx, 23.55, blip(880, 0.12), 0.25)
    for k in range(3):
        place(sfx, 23.83 + k * 0.12, ping(note_hz(84 + k * 2), note_hz(91 + k * 2)), 0.3, pan=0.4)
    # S8 — pricing
    place(sfx, 24.4, whoosh(0.4, 300, 5000, 0.8), 0.6)
    place(sfx, 24.5, impact(0.5), 0.45)
    for k, land in enumerate((24.75, 24.9, 25.05)):
        place(sfx, land - 0.25, whoosh(0.25, 3000, 400, 0.85), 0.3, pan=(k - 1) * 0.6)
        place(sfx, land, kick(1.2) * 0.6, 0.45, pan=(k - 1) * 0.6)
        for i in range(14):
            place(sfx, land + 0.05 + i * 0.05, tick(3500 + i * 150, 0.01), 0.18, pan=(k - 1) * 0.6)
        for j in range(4):
            place(sfx, land + 0.25 + j * 0.09, blip(note_hz(79 + j * 2 + k * 5), 0.05), 0.08, pan=(k - 1) * 0.6)
    place(sfx, 25.8, bell(note_hz(84), 1.0), 0.3)
    place(sfx, 27.45, whoosh(0.5, 6000, 200, 0.9)[::-1], 0.6)
    place(sfx, 27.4, riser(0.6, 300, 2500), 0.6)
    place(sfx, 27.9, glitch_burst(0.12, 77), 0.4)
    # S9 — finale
    place(sfx, 28.0, impact(1.6), 1.0)
    place(sfx, 28.0, filt(noise(2.0), 'high', 3500) * env_exp(2.0, 2.0), 0.5)
    for k, m in enumerate((69, 76, 81, 85, 88)):
        place(sfx, 28.0 + k * 0.07, bell(note_hz(m), 2.0), 0.4, pan=-0.4 + k * 0.2)
    place(sfx, 28.9, shimmer(0.6), 0.3)
    place(sfx, 28.7, pop(500, 1300), 0.45)
    place(sfx, 29.0, tick(2600, 0.03), 0.2)


# ---------------------------------------------------------------- mix
def reverb(x, secs=1.6, decay=3.2, mix=0.22):
    ir_n = int(secs * SR)
    ir = rng.standard_normal((ir_n, 2)) * np.exp(-np.arange(ir_n) / SR * decay)[:, None]
    ir = filt(ir[:, 0], 'low', 6000)[:, None] * [1, 0] + filt(ir[:, 1], 'low', 6000)[:, None] * [0, 1]
    wet = np.stack([fftconvolve(x[:, c], ir[:, c])[:len(x)] for c in range(2)], 1)
    wet *= np.max(np.abs(x)) / (np.max(np.abs(wet)) + 1e-9)
    return x * (1 - mix) + wet * mix


def main(path):
    build_music()
    build_sfx()
    m = music.copy()
    m *= duck[:, None] ** 0.8
    m = reverb(m, 1.2, 4.0, 0.15)
    s = reverb(sfx, 1.8, 3.0, 0.2)
    mix = m * 0.62 + s * 0.95
    mix = np.stack([filt(mix[:, c], 'high', 28) for c in range(2)], 1)
    mix /= np.max(np.abs(mix)) + 1e-9
    mix = np.tanh(mix * 1.15) / np.tanh(1.15)  # glue / soft limit
    fade = int(0.45 * SR)
    mix[-fade:] *= np.linspace(1, 0, fade)[:, None] ** 1.5
    mix *= 10 ** (-1 / 20) / (np.max(np.abs(mix)) + 1e-9)
    wavfile.write(path, SR, (mix * 32767).astype(np.int16))
    print('wrote', path)


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'out/audio.wav')
