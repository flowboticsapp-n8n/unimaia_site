/** @type {import('tailwindcss').Config} */
module.exports = {
  // O Tailwind lê estes arquivos e gera só as classes usadas (CSS final ~30 KB).
  content: ['./src/**/*.html', './src/js/**/*.js'],
  theme: {
    extend: {
      colors: {
        // Paleta tirada da logo Unimaia (azul-marinho do "V" e azuis das barras).
        // Botões com texto branco usam 600 ou mais escuro (contraste AA >= 4.5:1).
        brand: {
          50: '#eef9ff',
          100: '#d6f4fe',
          200: '#a9e4fb',
          300: '#6dcff6',
          400: '#2bb7ef',
          500: '#05a2e8',
          600: '#0277b4',
          700: '#035283',
          800: '#0a3d66',
          900: '#0a2748',
          950: '#06182e',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        heading: ['Outfit', '"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
