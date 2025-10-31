const esbuild = require('esbuild');

esbuild
  .build({
    entryPoints: ['web-src/src/index.js'],
    bundle: true,
    outdir: 'web-src/dist',
    outbase: 'web-src/src',
    entryNames: 'bundle',
    jsx: 'automatic',
    loader: {
      '.css': 'css',
      '.js': 'jsx'
    }
  })
  .then(() => {
    console.log('Build completed successfully');
  })
  .catch((error) => {
    console.error('Build failed:', error);
    process.exit(1);
  });

