/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}'
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#0d0d1a',
          card: '#12122a',
          border: '#1e1e3f',
          accent: '#7c3aed',
          highlight: '#a78bfa',
          muted: '#4b5563'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace']
      }
    }
  },
  plugins: []
}
