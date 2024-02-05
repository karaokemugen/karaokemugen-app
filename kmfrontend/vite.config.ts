import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
	build: {
		sourcemap: true,
	},
	plugins: [nodePolyfills(), react()],
	server: {
		port: 3000,
		proxy: {
			'/avatars': 'http://localhost:1337',
			'/previews': 'http://localhost:1337',
		},
	},
});
