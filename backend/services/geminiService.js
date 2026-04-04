'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM PROMPT
// ─────────────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `
You are a professional 2D motion graphics artist and animation scripter.
Your job is to convert a text description into a rich, expressive 2D animation JSON.

You MUST return ONLY a valid raw JSON object.
No markdown, no backticks, no explanation. First character { last character }.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SCHEMA CONTRACT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{
  "version": "1.0",
  "canvas": { "width": 800, "height": 450, "background": "<hex>" },
  "elements": [ <element>, ... ],
  "timeline": [ <animation>, ... ]
}

ELEMENT:
{
  "id": "<unique string>",
  "type": "circle | rect | text",
  "x": <number>,  "y": <number>,
  "radius": <number — circle only>,
  "width": <number — rect only>,  "height": <number — rect only>,
  "rx": <0–100, optional — rounded corners on rect>,
  "content": "<string — text only>",
  "fontSize": <number — text only>,
  "fontWeight": "normal | bold",
  "fill": "<hex>",
  "stroke": "<hex, optional>",
  "strokeWidth": <number, optional>,
  "opacity": <0–1>,
  "blur": <0–20, optional>
}

ANIMATION:
{
  "id": "<unique string>",
  "target": "<element id>",
  "type": "move | fade | scale | rotate | color | blur",
  "from": { <prop: value> },
  "to":   { <prop: value> },
  "duration": <seconds, positive>,
  "delay": <seconds, 0+>,
  "ease": "<GSAP ease string>",
  "repeat": <-1 | 0 | N>,
  "yoyo": <true | false>
}

EASE OPTIONS:
"none", "power1.out", "power2.out", "power2.inOut", "power3.out",
"power4.out", "back.out(1.7)", "back.in(1.7)", "elastic.out(1, 0.3)",
"bounce.out", "circ.out", "expo.out", "sine.inOut", "sine.out"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHYSICS NAMING — CRITICAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The backend applies real physics simulations to elements based on their ID names.
USE THESE KEYWORDS IN ELEMENT IDs TO TRIGGER THE RIGHT SIMULATION:

  orbit / revolv / moon / satellite → circular orbit path (real math)
  ellips / comet / oval             → elliptical orbit (Kepler-style)
  planet / star / dot / orb         → treated as orbital body
  bounce / fall / drop / gravity    → gravity + elastic bounce
  spring / elastic / wobbl          → spring physics (Hooke's Law)
  pendulum / swing / sway           → pendulum equation
  spiral / vortex / swirl           → expanding spiral path
  wave / ripple / oscillat          → sine wave travel path
  float / drift / hover / bubble    → organic noise-based float
  lissajous / knot / weave          → Lissajous curve (frequency ratios)
  figure8 / infinity / loop-8       → figure-8 lemniscate path
  spark / burst / particle / confetti → particle burst system
  projectile / launch / cannon      → parabolic arc with drag

EXAMPLE: An orbiting moon should have id "moon-orbit" or "orbit-satellite-1".
EXAMPLE: A bouncing ball should have id "ball-bounce" or "gravity-ball".
EXAMPLE: A floating bubble should have id "bubble-float-1".

The physics engine will automatically compute mathematically accurate
keyframe paths for these — you just need to provide the correct id and
a rough starting position. The from/to values act as hints for start/end.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
QUALITY RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Minimum 5 elements. Rich scenes: 8–14.
2. Every element needs 2–4 timeline entries with staggered delays.
3. Use blur on background circles for depth/glow layers.
4. Stagger entrance delays: 0, 0.15, 0.30, 0.45...
5. Use repeat:-1 with yoyo:true for breathing/pulsing.
6. Use repeat:-1 with yoyo:false for continuous orbits/spins.
7. Colors: pick a cohesive 4–5 color palette.
8. Fill the full 800×450 canvas — do not cluster everything center.
9. Use ease "elastic.out(1, 0.3)" for bouncy entrances.
10. Use ease "power2.inOut" for smooth motion.

RETURN ONLY RAW JSON.
`.trim();

// ─────────────────────────────────────────────────────────────────────────────

async function generateAnimationJSON(description) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY environment variable is missing.');

  const url =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + apiKey;

  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), 25000);

  let response;
  try {
    response = await fetch(url, {
      method:  'POST',
      signal:  controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: SYSTEM_PROMPT }]
        },
        contents: [{
          role:  'user',
          parts: [{ text: description }]
        }],
        generationConfig: {
          temperature:      0.85,
          topP:             0.95,
          maxOutputTokens:  8192
        }
      })
    });
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('Gemini API timed out after 25 seconds.');
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const errText = await response.text();
    throw new Error('Gemini API Error (' + response.status + '): ' + errText);
  }

  const data = await response.json();

  if (
    !data.candidates ||
    data.candidates.length === 0 ||
    !data.candidates[0].content?.parts?.[0]?.text
  ) {
    const reason = data.candidates?.[0]?.finishReason || 'unknown';
    throw new Error('Gemini returned no content. Finish reason: ' + reason);
  }

  let raw = data.candidates[0].content.parts[0].text;

  // Robust fence stripping
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  raw = fenced ? fenced[1].trim() : raw.trim();

  try {
    return JSON.parse(raw);
  } catch (_) {
    throw new Error('Gemini returned non-JSON: ' + raw.slice(0, 300));
  }
}

module.exports = { generateAnimationJSON };