'use strict';

/**
 * System prompt that instructs the AI to always return
 * a valid animation JSON following our schema contract.
 */
const SYSTEM_PROMPT = `
You are an animation script generator. Your job is to convert a user's text description into a structured 2D animation JSON.

You MUST always return a valid JSON object. No extra text, no markdown, no explanation — ONLY raw JSON.

The JSON must follow this exact schema:

{
  "version": "1.0",
  "canvas": {
    "width": <number, e.g. 800>,
    "height": <number, e.g. 450>,
    "background": "<hex color>"
  },
  "elements": [
    {
      "id": "<unique string>",
      "type": "<circle | rect | text>",
      "x": <number>,
      "y": <number>,
      "radius": <number, only for circle>,
      "width": <number, only for rect>,
      "height": <number, only for rect>,
      "fill": "<hex color>",
      "opacity": <0 to 1>,
      "content": "<string, only for text type>",
      "fontSize": <number, only for text type>
    }
  ],
  "timeline": [
    {
      "id": "<unique string>",
      "target": "<element id to animate>",
      "type": "<move | fade | scale | rotate | color>",
      "from": { <property: startValue> },
      "to": { <property: endValue> },
      "duration": <seconds as number>,
      "delay": <seconds as number>,
      "ease": "<GSAP ease string, e.g. power2.inOut>",
      "repeat": <0 for none, -1 for infinite>,
      "yoyo": <true | false>
    }
  ]
}

Rules:
- All element ids must be unique strings
- All timeline targets must reference a valid element id
- For "move": use from/to with x/y
- For "fade": use from/to with opacity
- For "scale": use from/to with scaleX/scaleY
- For "rotate": use from/to with rotation
- For "color": use from/to with fill
`;

/**
 * Calls Gemini API natively with the user's description.
 * Returns a parsed animation JSON object.
 * @param {string} description - User's animation description
 * @returns {Promise<object>} - Parsed animation JSON
 */
async function generateAnimationJSON(description) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is missing.');
  }

  // Exactly matching the structure requested
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + apiKey;

  // We pack the system prompt and the user input together
  const fullPrompt = SYSTEM_PROMPT + '\n\nUser Request: ' + description;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: fullPrompt }
          ]
        }
      ]
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error('Gemini API Error (' + response.status + '): ' + errText);
  }

  const data = await response.json();
  let rawContent = data.candidates[0].content.parts[0].text;

  // Strip markdown formatting if Gemini includes it
  rawContent = rawContent.replace(/^```json/mi, '').replace(/```$/m, '').trim();

  let parsed;
  try {
    parsed = JSON.parse(rawContent);
  } catch (parseError) {
    throw new Error('Gemini returned non-JSON content: ' + rawContent.slice(0, 200));
  }

  return parsed;
}

module.exports = { generateAnimationJSON };
