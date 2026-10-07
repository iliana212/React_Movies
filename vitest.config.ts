import { fileURLToPath } from 'node:url';
import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(
  viteConfig,
  defineConfig({
    resolve: {
      // Vite empaqueta axios con su build de navegador; en Vitest (Node) se resolvería el build de Node, que serializa
      // FormData/File con el paquete `form-data` y no con los de jsdom. Este alias hace que las pruebas usen lo mismo que producción.
      alias: { axios: fileURLToPath(new URL('./node_modules/axios/dist/esm/axios.js', import.meta.url)) },
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/__tests__/utils/setup.ts'],
      include: ['src/__tests__/**/*.test.{ts,tsx}'],
      // Los CSS Modules se procesan con nombres de clase sin hash para poder aserciones como toHaveClass('checked')
      css: { include: [/\.module\.css$/], modules: { classNameStrategy: 'non-scoped' } },
      clearMocks: true,
      coverage: {
        provider: 'v8',
        include: ['src/**/*.{ts,tsx}'],
        exclude: ['src/__tests__/**', 'src/main.tsx', 'src/Yupi.tsx', 'src/vite-env.d.ts', 'src/**/*.model.ts', 'src/**/modelos/**'],
        reporter: ['text', 'html'],
      },
    },
  }),
);
