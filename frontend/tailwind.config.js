/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        tropia: {
          bg:      '#eae1d4',  // fundo principal (creme)
          dark:    '#250000',  // texto / nav dark (marrom-preto)
          brown:   '#432d1c',  // marrom escuro de apoio
          sand:    '#e0d4c2',  // superfícies claras
          muted:   '#654a2b',  // textos secundários (marrom médio)
          border:  '#d6c8b3',  // bordas
          card:    '#ddcfb9',  // cards de categoria
          accent:  '#ffc509',  // amarelo — badges e destaques
        }
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        serif: ['Cormorant Garamond', 'Georgia', 'serif'],
      }
    }
  },
  plugins: []
}
