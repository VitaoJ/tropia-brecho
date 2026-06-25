/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        tropia: {
          bg:      '#f5f2ee',  // fundo principal
          dark:    '#1a1a18',  // texto / nav dark
          sand:    '#e8e2d8',  // superfícies claras
          muted:   '#8c8278',  // textos secundários
          border:  '#ddd8d0',  // bordas
          card:    '#ede8e0',  // cards de categoria
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    }
  },
  plugins: []
}
