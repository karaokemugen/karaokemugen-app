import legacy from '@vitejs/plugin-legacy';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
	build: {
		sourcemap: true,
	},
	css: {
		preprocessorOptions: {
			scss: {
				api: 'modern-compiler',
				silenceDeprecations: ['mixed-decls'],
			},
		},
	},
	plugins: [nodePolyfills(), react(), legacy()],
	server: {
		port: 3000,
		proxy: {
			'/avatars': 'http://localhost:1337',
			'/previews': 'http://localhost:1337',
			'/api': 'http://localhost:1337',
		},
	},
});
