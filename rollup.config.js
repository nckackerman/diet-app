import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import copy from 'rollup-plugin-copy';

export default {
  input: 'src/js/app.js',
  output: {
    file: 'dist/app.js',
    format: 'iife',
    name: 'DietApp',
    sourcemap: true
  },
  plugins: [
    resolve(),
    commonjs(),
    terser({
      format: {
        comments: false
      },
      compress: {
        drop_debugger: true
      }
    }),
    copy({
      targets: [
        { src: 'index.html', dest: 'dist' },
        { src: 'data/*', dest: 'dist/data' },
        { src: 'src/css/*', dest: 'dist/css' }
      ]
    })
  ]
}; 