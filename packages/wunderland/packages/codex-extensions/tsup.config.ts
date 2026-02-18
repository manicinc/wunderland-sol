import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    loader: 'src/loader/index.ts',
    manager: 'src/manager/index.ts',
    security: 'src/security/index.ts',
    themes: 'src/themes/index.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ['react', '@framers/codex-viewer'],
  treeshake: true,
  splitting: true,
  minify: false,
});





