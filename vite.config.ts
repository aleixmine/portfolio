import { defineConfig } from 'vite'
import htmlMinifier from 'vite-plugin-html-minifier'
export default defineConfig({
  build: {
    minify: 'oxc',
    cssMinify: true,
  },
  plugins: [
    htmlMinifier({
      minify: true,
    }),
  ],
})