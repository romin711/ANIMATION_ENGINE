# AI 2D Animation Generator

A full-stack web application that converts natural language animation prompts into structured 2D animation scenes, then renders and animates them in the browser.

## 1. Project Overview

AI 2D Animation Generator helps users create simple motion graphics without manually writing SVG or animation code. Instead of hand-authoring timelines, users describe what they want in plain language, and the system generates a validated animation JSON script and plays it instantly.

### Problem it solves
- Creating even basic 2D animations typically requires design tooling or frontend animation knowledge.
- Prompt-to-animation flow reduces the barrier for prototyping visual ideas.

### Target users
- Frontend developers prototyping motion quickly
- Students learning animation data models (scene + timeline)
- Creators and hobbyists experimenting with AI-assisted visuals

## 2. Features

### Prompt and Generation
- Natural language prompt input for animation intent
- Prompt enrichment using visual controls (shape, color, speed, duration)
- Backend integration with Google Gemini model for JSON generation

### Validation and Reliability
- Server-side input validation for request payloads
- Schema-based validation of AI output before returning data to client
- Structured error responses for invalid AI output or malformed requests

### Rendering and Playback
- SVG scene rendering from generated JSON
- GSAP timeline playback for animation sequences
- Supported animation types: move, fade, scale, rotate, color
- Playback controls: play, pause, restart, scrub timeline

### UX and Productivity
- Generation status states (idle, loading, success, error)
- Prompt suggestions to help users start quickly
- Local history of generated animations in UI state

### Export
- Browser-based WebM video export using MediaRecorder
- Configurable export duration (fixed seconds or auto)

## 3. Tech Stack

### Frontend
- JavaScript (ES Modules)
- React 18
- Vite 5
- Tailwind CSS 3 + PostCSS + Autoprefixer
- GSAP 3 for timeline animation
- Axios for HTTP requests
- Lucide React for icons

### Backend
- Node.js
- Express 4
- CORS middleware
- dotenv for environment variable management
- Native fetch call to Gemini API endpoint

### AI / External Service
- Google Generative Language API
- Model used in code: gemini-2.5-flash

### Tooling
- Nodemon for backend development mode
- npm for package management

### Database
- No database is used in the current implementation

## 4. System Architecture

The project uses a two-tier architecture:
- Frontend client (React): prompt input, rendering, playback, export
- Backend API (Express): request validation, AI orchestration, schema validation

### Module responsibilities

#### Backend
- server.js: API bootstrap, middleware setup, health endpoint, global error handler
- routes/animationRoutes.js: route registration for animation generation
- controllers/animationController.js: request validation, service orchestration, response handling
- services/geminiService.js: prompt construction, Gemini API call, JSON parsing
- validators/animationValidator.js: contract validation for animation JSON
- schema/animationSchema.js: canonical schema reference

#### Frontend
- src/App.jsx: application state and orchestration
- src/components/ControlPanel.jsx: prompt + controls + history tab
- src/components/AnimationCanvas.jsx: SVG rendering, GSAP timeline, export workflow
- src/components/TopNav.jsx: status-aware top navigation
- src/services/animationService.js: API client wrapper

Note: src/components/JSONInputPanel.jsx and src/components/StatusPanel.jsx exist in the repository but are not currently mounted in App.

### Data flow

Input -> Processing -> Output

1. User writes a prompt and configures visual controls in frontend.
2. Frontend merges user input into a single enriched description string.
3. Frontend sends POST request to backend endpoint.
4. Backend validates request body.
5. Backend sends prompt to Gemini API and receives generated JSON text.
6. Backend parses and validates JSON against animation contract.
7. Backend returns validated animation payload.
8. Frontend renders SVG elements and plays timeline via GSAP.
9. User can scrub, replay, and export to WebM.

## 5. Project Structure

~~~text
2d_animation_generator/
├── .gitignore
├── README.md
├── backend/
│   ├── .env
│   ├── .env.example
│   ├── package.json
│   ├── server.js
│   ├── controllers/
│   │   └── animationController.js
│   ├── routes/
│   │   └── animationRoutes.js
│   ├── schema/
│   │   └── animationSchema.js
│   ├── services/
│   │   └── geminiService.js
│   └── validators/
│       └── animationValidator.js
└── frontend/
    ├── index.html
    ├── package.json
    ├── postcss.config.js
    ├── tailwind.config.js
    ├── vite.config.js
    └── src/
        ├── App.jsx
        ├── index.css
        ├── main.jsx
        ├── components/
        │   ├── AnimationCanvas.jsx
        │   ├── ControlPanel.jsx
        │   ├── JSONInputPanel.jsx
        │   ├── StatusPanel.jsx
        │   └── TopNav.jsx
        └── services/
            └── animationService.js
~~~

## 6. Installation and Setup

### Prerequisites
- Node.js 18+
- npm 9+
- A valid Google Gemini API key

### 1) Clone repository
~~~bash
git clone https://github.com/your-username/2d_animation_generator.git
cd 2d_animation_generator
~~~

### 2) Install backend dependencies
~~~bash
cd backend
npm install
~~~

### 3) Configure backend environment
Create or update backend/.env with:

~~~env
GEMINI_API_KEY=your_gemini_api_key
PORT=5000
~~~

Security note: if backend/.env.example contains a real key, rotate that key and replace it with a placeholder before publishing.

### 4) Install frontend dependencies
~~~bash
cd ../frontend
npm install
~~~

### 5) Run backend (Terminal 1)
~~~bash
cd backend
npm run dev
~~~

### 6) Run frontend (Terminal 2)
~~~bash
cd frontend
npm run dev
~~~

### 7) Open application
- Frontend: http://localhost:5173
- Backend health check: http://localhost:5000/health

## 7. Usage

### Basic workflow
1. Open the app in browser.
2. Enter a prompt in the Create tab. Example: A glowing blue planet orbiting a bright yellow star.
3. Optionally adjust visual settings (shape, color, speed, duration).
4. Click Generate Animation.
5. Review the generated animation in the preview canvas.
6. Use playback controls to scrub or replay.
7. Optionally export as WebM video.

### Example input
~~~text
A red square spinning continuously while fading in and out on a dark background.
~~~

### Example success response shape
~~~json
{
  "animation": {
    "version": "1.0",
    "canvas": {
      "width": 800,
      "height": 450,
      "background": "#1a1a2e"
    },
    "elements": [
      {
        "id": "square-1",
        "type": "rect",
        "x": 300,
        "y": 180,
        "width": 120,
        "height": 120,
        "fill": "#ef4444",
        "opacity": 1
      }
    ],
    "timeline": [
      {
        "id": "spin-1",
        "target": "square-1",
        "type": "rotate",
        "from": { "rotation": 0 },
        "to": { "rotation": 360 },
        "duration": 2,
        "delay": 0,
        "ease": "power2.inOut",
        "repeat": -1,
        "yoyo": false
      }
    ]
  }
}
~~~

## 8. Screenshots and Demo

Add repository assets when available:
- docs/images/home.png
- docs/images/generated-animation.png
- docs/images/error-state.png
- Demo video or GIF link

Placeholder markdown:

~~~md
![Home Screen](docs/images/home.png)
![Generated Animation](docs/images/generated-animation.png)
~~~

## 9. API Documentation

### Base URL
- Local: http://localhost:5000

### Health Check
- Method: GET
- Endpoint: /health

Success response:
~~~json
{
  "status": "ok",
  "message": "AI Animation Backend is running"
}
~~~

### Generate Animation
- Method: POST
- Endpoint: /api/animation/generate
- Content-Type: application/json

Request body:
~~~json
{
  "description": "A blue circle moving from left to right"
}
~~~

Success response (200):
~~~json
{
  "animation": {
    "version": "1.0",
    "canvas": { "width": 800, "height": 450, "background": "#1a1a2e" },
    "elements": [],
    "timeline": []
  }
}
~~~

Validation error (400):
~~~json
{
  "error": "Validation error",
  "details": "Request body must include a non-empty \"description\" string."
}
~~~

AI schema validation error (422):
~~~json
{
  "error": "AI returned invalid animation JSON",
  "details": [
    "timeline[0]: \"target\" must reference a valid element id."
  ]
}
~~~

Server error (500):
~~~json
{
  "error": "Internal server error",
  "details": "Error message"
}
~~~

## 10. Future Improvements

- Add persistent storage for prompt history and saved projects
- Add authentication and user workspaces
- Add richer shape library (paths, groups, gradients)
- Add timeline editor UI for manual post-generation tuning
- Improve validator with stricter per-animation-type rules
- Add automated tests (unit and integration)
- Add Docker support for one-command local startup
- Add CI pipeline for lint, tests, and build checks

## 11. Contributing

Contributions are welcome.

1. Fork the repository.
2. Create a feature branch.
3. Make focused, testable changes.
4. Open a pull request with a clear description and screenshots when UI changes are involved.

Recommended contribution quality:
- Keep changes small and scoped
- Follow existing code style
- Update documentation for behavior changes

## 12. License

This project is licensed under the MIT License.

~~~text
MIT License

Copyright (c) 2026

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the Software), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED AS IS, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
~~~

## 13. Author

Meet Patel

Software engineer focused on building practical, user-facing products with clean architecture and strong developer experience.
