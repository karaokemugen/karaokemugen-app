import legacy from '@vitejs/plugin-legacy';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { sentryVitePlugin } from '@sentry/vite-plugin';

export default defineConfig({
	build: {
		sourcemap: true,
	},
	plugins: [
		nodePolyfills(), 
		react(), 
		legacy(),
		...(process.env.SENTRY_AUTH_TOKEN && process.env.BUILDVERSION ? [
			sentryVitePlugin({
				authToken: process.env.SENTRY_AUTH_TOKEN && process.env.CI_COMMIT_TAG,
				org: 'karaoke-mugen',
				project: 'km-app',
				release: {
					name: process.env.CI_COMMIT_TAG,
					dist: process.env.CI_COMMIT_SHORT_SHA,
				},
			}),
		] : []),
	],
	server: {
		port: 3000,
		proxy: {
			'/avatars': 'http://localhost:1337',
			'/previews': 'http://localhost:1337',
			'/api': 'http://localhost:1337',
		},
	},
});
