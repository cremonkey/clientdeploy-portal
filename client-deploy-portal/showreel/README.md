# ClientDeploy — 30s Motion Showreel

A 30-second, 1080p60 promo/showreel for **ClientDeploy Portal**, built entirely in code:
every frame is drawn on a canvas from a pure `draw(t)` function, and every sound is synthesized
(no stock footage, samples or music licenses).

**Final video:** [`showreel.mp4`](./showreel.mp4)

## Storyboard (120 BPM, cut on the beat)

| Time | Scene | What it sells |
|------|-------|---------------|
| 0–3s | Cold open: heartbeat dot → terminal `clientdeploy ship acme-store` | Developer-grade tooling |
| 3–6s | Kinetic type: ~~SSH KEYS~~ ~~SERVER ACCESS~~ ~~A DEVOPS TEAM~~ → **ONE BUTTON.** | The pain it removes |
| 6–8.5s | Drop: logo build, shockwave, light sweep | Brand |
| 8.5–13s | Dashboard: cursor clicks Deploy → Clone/Build/Test/Live → "LIVE IN 42s" + confetti | One-click deploys |
| 13–17.5s | Live logs; laser scan redacts DB passwords, AWS keys, IPs, SSH keys | Triple-layer log sanitization |
| 17.5–21.5s | IP allowlist / secret token / HMAC rings block bad webhooks → tenant grid | Webhook trust + tenant isolation |
| 21.5–24.5s | Rapid panels: health checks, backups, deploy guardrails, real-time alerts | Ops features |
| 24.5–28s | Pricing cards: $9.99 / $29.99 / $99.99 | Plans (from `DatabaseSeeder`) |
| 28–30s | End card + CTA | Call to action |

Craft details: 4-subframe motion blur (180° shutter), impact-driven camera shake, glitch/RGB-split
hits, animated grain + vignette, and a soundtrack with a sidechained A-minor groove, breakdown under the
log scan, and ~40 SFX cues (typing, slashes, drop, UI clicks, pops, lock clunks, redaction glitches,
CRT power-off, chimes) all locked to the visual timeline.

## Rebuild

Requires Node 18+, Python 3 with `numpy scipy`, and `ffmpeg` on `PATH`.

```bash
cd showreel
npm install                               # playwright
node render.mjs --stills 6.3,12.5,28.8    # optional: preview frames into out/
node render.mjs                           # render video segments (WORKERS=4 SUB=4 by default)
python3 audio.py out/audio.wav            # synthesize the soundtrack
ffmpeg -f concat -safe 0 -i out/segments.txt -i out/audio.wav \
  -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p -movflags +faststart \
  -c:a aac -b:a 256k -af loudnorm=I=-14:TP=-1 -shortest showreel.mp4
```

Timeline cue times live in both `scene.html` and `audio.py`; change them together.
