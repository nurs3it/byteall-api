import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Force Vite to resolve all @tiptap/* packages from the local node_modules
// instead of the root workspace node_modules where @tiptap/core is stuck at v2.x
// (hoisted from @adminjs/design-system), while @tiptap/extension-list etc. are v3.x.
const tiptapPackages = [
  'core',
  'pm',
  'react',
  'starter-kit',
  'extension-blockquote',
  'extension-bold',
  'extension-bubble-menu',
  'extension-bullet-list',
  'extension-code',
  'extension-code-block',
  'extension-document',
  'extension-dropcursor',
  'extension-floating-menu',
  'extension-gapcursor',
  'extension-hard-break',
  'extension-heading',
  'extension-horizontal-rule',
  'extension-image',
  'extension-italic',
  'extension-link',
  'extension-list-item',
  'extension-ordered-list',
  'extension-paragraph',
  'extension-strike',
  'extension-text',
];

const tiptapAliases = Object.fromEntries(
  tiptapPackages.map((pkg) => [
    `@tiptap/${pkg}`,
    path.resolve(__dirname, `node_modules/@tiptap/${pkg}`),
  ])
);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: tiptapAliases,
  },
  server: {
    port: 3001,
    proxy: {
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
