const esbuild = require('esbuild');

esbuild
  .build({
    entryPoints: ['web-src/src/index.js'],
    bundle: true,
    outfile: 'web-src/dist/bundle.js',
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

