import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			pages: 'build/static',
			assets: 'build/static',
			fallback: 'index.html',  // SPA mode
			precompress: true
		})
	}
};

export default config;
