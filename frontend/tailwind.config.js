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
        },

        // Os nomes que os componentes do shadcn esperam, apontando direto
        // para a paleta da Tropia. Sem a camada de variáveis CSS do shadcn de
        // propósito: a loja tem um tema só, e a indireção só serviria para
        // trocar de tema. Assim `bg-primary` num Dialog já sai no vinho da
        // marca, sem precisar reestilizar componente por componente.
        border:      '#d6c8b3',
        input:       '#d6c8b3',
        ring:        '#654a2b',
        background:  '#eae1d4',
        foreground:  '#250000',
        primary: {
          DEFAULT:   '#250000',
          foreground:'#eae1d4',
        },
        secondary: {
          DEFAULT:   '#e0d4c2',
          foreground:'#250000',
        },
        // `accent` no shadcn é fundo de hover de menu, não cor de destaque —
        // usar o amarelo da marca aqui deixaria todo item de menu berrante.
        // O amarelo continua sendo aplicado à mão onde é para chamar atenção.
        accent: {
          DEFAULT:   '#ddcfb9',
          foreground:'#250000',
        },
        muted: {
          DEFAULT:   '#e0d4c2',
          foreground:'#654a2b',
        },
        popover: {
          DEFAULT:   '#eae1d4',
          foreground:'#250000',
        },
        card: {
          DEFAULT:   '#f2ead9',
          foreground:'#250000',
        },
        destructive: {
          DEFAULT:   '#7a1f1f',
          foreground:'#eae1d4',
        },
      },
      borderRadius: {
        // A loja é editorial e reta; o 0.5rem padrão do shadcn arredondaria
        // demais ao lado das bordas de 2px que o resto do site usa.
        lg: '0.25rem',
        md: '0.1875rem',
        sm: '0.125rem',
      },
      fontFamily: {
        sans: ['ATF Franklin Gothic', 'Libre Franklin', 'Franklin Gothic Medium', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to:   { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to:   { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up':   'accordion-up 0.2s ease-out',
      },
    }
  },
  plugins: [require('tailwindcss-animate')]
}
