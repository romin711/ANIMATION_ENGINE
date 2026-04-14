# LLM To Builder Refactor Guide

## Purpose

This guide explains how to fix the core backend reliability problem in the animation generator.

Status update: the backend now implements the classify-first builder flow described below. This guide remains as the design record and verification checklist for the current code.

Current implementation highlights:

- prompt classification now returns deterministic `type` and `complexity`
- simple prompts skip Gemini and build locally
- complex prompts call Gemini for a compact plan only
- the builder map is strict and deterministic
- metrics and an audit harness are in place for verification

The legacy system asked Gemini to generate the final animation JSON directly. That created repeated issues:

- output gets too large
- JSON gets truncated
- requests time out
- provider rate limits are hit
- small prompts still produce oversized scenes
- validation fails because the model is generating low-level structure directly

The better architecture is:

1. use the LLM for intent only
2. use backend code for structure
3. generate final animation JSON deterministically in code


## Current Problem

The original backend flow was roughly:

1. controller receives prompt
2. `geminiService.js` asks Gemini for full final animation JSON
3. backend parses JSON
4. validator checks JSON
5. enricher adds physics
6. frontend renders result

This is fragile because the LLM is responsible for too much:

- scene design
- layer count
- element count
- exact JSON nesting
- ids
- animation timing
- easing
- optional properties
- decorative layers

Large nested JSON is exactly the kind of output that models fail at under pressure.

The current implementation now avoids that failure mode by routing through a prompt classifier, compact Gemini plans, and deterministic builders.


## Better Architecture

Replace the current design with this:

1. prompt classifier
2. animation planner
3. animation builder
4. validator
5. enricher
6. frontend

### Prompt Classifier

This now decides whether a prompt is:

- simple and local
- complex and Gemini-assisted
- unknown and routed to the abstract fallback

Examples:

- `red square spinning`
  Route directly to a local template.

- `candle stick pattern`
  Route directly to a local template.

- `blue planet orbiting a star`
  Route to an orbit template.

- `cinematic futuristic city with floating neon particles`
  Use Gemini planning first, then deterministic builders.


## Key Design Rule

Use AI for intent.
Use code for structure.

That means:

- Gemini should decide what the animation means.
- Backend code should decide how the final JSON is built.


## Recommended Refactor Plan

### Phase 1: Add A Tiny Planning Schema

Create a small schema that Gemini can return safely.

Suggested file:

- `backend/schema/animationPlanSchema.js`

Suggested structure:

```js
const ANIMATION_PLAN_SCHEMA = {
  version: '1.0',
  sceneType: 'single-object | orbit | chart | text | abstract | multi-object',
  subject: {
    type: 'square | circle | planet | candlestick | text | custom',
    label: 'string',
    color: 'string'
  },
  secondarySubjects: [],
  motion: {
    type: 'spin | orbit | fade | bounce | float | pulse | reveal',
    loop: true
  },
  style: {
    complexity: 'basic | medium | rich',
    mood: 'clean'
  }
};
```

Important rule:

- keep this schema tiny
- no coordinates
- no large arrays
- no detailed layer instructions
- no direct final SVG-like config


### Phase 2: Replace `generateAnimationJSON` With `generateAnimationPlan`

In [geminiService.js](/home/meetpatel/ROMIN/personal_project/ANIMATION_ENGINE/backend/services/geminiService.js), stop asking Gemini for final animation JSON.

Instead ask Gemini for a small plan only.

That new service should:

- receive prompt
- request plan JSON from Gemini
- parse plan
- validate plan
- return plan object

The prompt for Gemini should change from:

- "return final animation JSON"

to:

- "return only a minimal animation intent plan"

The planning prompt should explicitly say:

- do not generate coordinates
- do not generate many layers
- do not generate final element arrays
- do not generate final timeline arrays
- return only the small plan object


### Phase 3: Build Final Animation JSON In Code

Create a builder layer.

Suggested files:

- `backend/builders/buildAnimationFromPlan.js`
- `backend/builders/templates/basicShapeBuilder.js`
- `backend/builders/templates/orbitBuilder.js`
- `backend/builders/templates/candlestickBuilder.js`
- `backend/builders/templates/textBuilder.js`

The builder should:

- accept a small plan
- choose a template
- generate final animation JSON
- apply sensible defaults
- guarantee compact output

This is where exact coordinates, durations, ids, and element arrays should be created.

Example:

- if plan says `sceneType: single-object` and `motion.type: spin`
- builder returns one `rect` element plus one `rotate` timeline entry

No LLM is needed to decide that low-level structure.


## Template Families To Implement First

Start with the most common and safest templates.

### 1. Spinning Shape Template

Use for:

- square spin
- rotating box
- spinning rectangle
- simple geometric object

Output:

- 1 main element
- 1 rotate animation


### 2. Orbit Template

Use for:

- planet orbiting star
- moon orbit
- satellite loop

Output:

- 1 star
- 1 planet
- 1 orbit motion


### 3. Candlestick Pattern Template

Use for:

- candle stick pattern
- candlestick chart
- stock candle bars

Output:

- 2 to 4 candle bodies max
- simple fade or reveal
- no unnecessary wick decorations unless needed


### 4. Text Reveal Template

Use for:

- show text
- title reveal
- animated label

Output:

- 1 text element
- 1 fade or move animation


### 5. Bounce / Float Template

Use for:

- bouncing ball
- floating bubble
- drifting object

Output:

- 1 main element
- 1 move animation
- optional physics enrichment later


## Phase 4: Add Prompt Classification Before Gemini

Create a classifier layer.

Suggested file:

- `backend/processors/PromptClassifier.js`

This should detect whether a prompt is:

- direct template match
- partial template match
- unknown creative prompt

Example logic:

```js
if (prompt includes square && prompt includes spin) => spinning-shape
if (prompt includes candlestick || candle stick) => candlestick
if (prompt includes orbit || planet || satellite) => orbit
if (prompt includes text || title || label) => text
else => use Gemini planner
```

This immediately solves a large part of the failure rate because many prompts never need Gemini at all.


## Phase 5: Keep Gemini Only For Planning

For prompts that are not matched by local templates:

1. classifier says `use planner`
2. Gemini returns small plan
3. builder transforms plan into final JSON

That reduces risk dramatically because even creative prompts still produce deterministic final output.


## Phase 6: Keep Validator After Builder

Keep the validator in:

- [animationValidator.js](/home/meetpatel/ROMIN/personal_project/ANIMATION_ENGINE/backend/validators/animationValidator.js)

But change its role.

Today:

- validator protects against malformed LLM JSON

After refactor:

- validator confirms builder output is still correct

This is a much better role for validation.


## Phase 7: Physics Should Be Post-Processing Only

The physics layer should not depend on Gemini writing large detailed JSON.

Instead:

1. builder creates compact valid animation
2. enricher optionally upgrades specific move animations

That keeps physics as an enhancement, not a generation requirement.


## Suggested Final Request Flow

### Simple Prompt

Example:

- `red square spinning`

Flow:

1. controller receives prompt
2. classifier matches `spinning-shape`
3. builder creates animation JSON directly
4. validator checks output
5. enricher optionally runs
6. frontend renders

Gemini is skipped completely.


### Medium Prompt

Example:

- `blue planet orbiting a star`

Flow:

1. controller receives prompt
2. classifier matches `orbit`
3. orbit builder creates basic scene
4. validator checks output
5. enricher adds orbit physics if needed
6. frontend renders

Gemini is skipped completely.


### Creative Prompt

Example:

- `a cinematic futuristic city with floating neon particles`

Flow:

1. controller receives prompt
2. classifier says `creative`
3. Gemini planner returns tiny plan
4. builder maps plan to a scene template
5. validator checks output
6. enricher adds motion upgrades
7. frontend renders


## Why This Solves The Main Failures

### Fixes `MAX_TOKENS`

Because Gemini no longer returns huge nested final JSON.

### Fixes malformed JSON risk

Because the LLM output becomes tiny and easier to parse safely.

### Fixes timeout risk

Because smaller outputs are faster.

### Fixes rate limit pressure

Because many prompts will never call Gemini.

### Fixes overbuilt scenes

Because the builder controls layer counts and timeline counts.

### Fixes inconsistent output

Because code produces the structure, not the model.


## Concrete File Plan

Current files in use:

- `backend/schema/animationPlanSchema.js`
- `backend/validators/animationPlanValidator.js`
- `backend/processors/PromptClassifier.js`
- `backend/builders/buildAnimationFromPlan.js`
- `backend/builders/templates/basicShapeBuilder.js`
- `backend/builders/templates/orbitBuilder.js`
- `backend/builders/templates/candlestickBuilder.js`
- `backend/builders/templates/textBuilder.js`
- `backend/builders/templates/bounceSceneBuilder.js`
- `backend/builders/templates/floatSceneBuilder.js`
- `backend/builders/templates/particleExplosionBuilder.js`
- `backend/builders/templates/particleFlowFieldBuilder.js`
- `backend/builders/templates/multiBuilder.js`
- `backend/builders/templates/skylineSceneBuilder.js`
- `backend/builders/templates/advancedChartSceneBuilder.js`
- `backend/utils/metrics.js`
- `backend/temp.js`

Recommended files to update:

- [geminiService.js](/home/meetpatel/ROMIN/personal_project/ANIMATION_ENGINE/backend/services/geminiService.js)
- [animationController.js](/home/meetpatel/ROMIN/personal_project/ANIMATION_ENGINE/backend/controllers/animationController.js)
- [animationValidator.js](/home/meetpatel/ROMIN/personal_project/ANIMATION_ENGINE/backend/validators/animationValidator.js)


## Controller Refactor Sketch

Current controller flow:

```js
async function generateAnimation(req, res, next) {
  try {
    const prompt = normalizePrompt(req.body.description);
    const classification = classifyPrompt(prompt);

    const plan = classification.complexity === 'simple'
      ? createDirectPlan(prompt, classification.type)
      : await geminiService.generateAnimationPlan(prompt);

    const validation = validateAnimationPlan(plan);
    if (!validation.valid) {
      return res.status(422).json({ error: 'Invalid animation plan', details: validation.errors });
    }

    const animationJSON = buildAnimationFromPlan(plan, prompt);
    const outputValidation = validateAnimationJSON(animationJSON);
    if (!outputValidation.valid) {
      return res.status(422).json({ error: 'Invalid animation JSON', details: outputValidation.errors });
    }

    return res.status(200).json({ animation: enrichAnimation(animationJSON) });
  } catch (err) {
    next(err);
  }
}
```


## Builder Rules

Every builder should follow these rules:

- default to basic output
- prefer 1 main subject
- only add support elements if they visibly improve the result
- keep timeline short
- use stable ids
- use deterministic positions
- use deterministic colors unless prompt specifies otherwise
- keep output validator-safe


## Migration Strategy

Do not rewrite everything in one step.

### Step 1

Add classifier and direct local templates for:

- square spin
- candlestick
- orbit

This alone will remove a lot of Gemini load.

### Step 2

Introduce the small Gemini planning schema.

### Step 3

Create builders for plan-driven output.

### Step 4

Move more prompt families out of full Gemini generation.

### Step 5

Delete the old “Gemini returns final JSON” path once confidence is high.


## Acceptance Criteria

You should consider the refactor successful when:

- simple prompts do not call Gemini
- Gemini never needs to return large final animation JSON
- malformed JSON errors become rare
- `MAX_TOKENS` becomes rare
- average response time decreases
- validator failures decrease
- output complexity is more consistent


## Metrics To Track

Track these before and after:

- average request time
- timeout count
- `MAX_TOKENS` count
- JSON parse failure count
- Gemini request count
- fallback/template hit rate
- validator failure count


## Risks And Notes

### Risk 1: Output becomes too repetitive

Fix:

- support 2 to 3 variants per builder template
- choose variant deterministically from prompt hash

### Risk 2: Creative prompts feel too constrained

Fix:

- only use Gemini for planning on creative prompts
- allow builder variants and optional enrichers

### Risk 3: Too many template branches

Fix:

- start with a small set of high-value templates
- expand only when real prompts justify it


## Recommended First Implementation Order

If starting now, do this exact order:

1. create `PromptClassifier.js`
2. create `basicShapeBuilder.js`
3. create `candlestickBuilder.js`
4. create `orbitBuilder.js`
5. update controller to route simple prompts to builders
6. create `animationPlanSchema.js`
7. change Gemini service to return plan only
8. create `buildAnimationFromPlan.js`
9. route creative prompts through planner + builder
10. remove old full-JSON Gemini generation path


## Final Summary

The core fix is not “better retries” or “more token tuning”.

The core fix is:

- stop asking the LLM for final large animation JSON
- ask the LLM for a tiny intent plan only
- generate final JSON in code

That will make the backend faster, cheaper, more stable, and much easier to maintain.
