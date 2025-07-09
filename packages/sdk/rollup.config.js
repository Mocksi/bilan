import typescript from '@rollup/plugin-typescript'
import dts from 'rollup-plugin-dts'
import terser from '@rollup/plugin-terser'

export default [
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.js',
      format: 'esm',
      sourcemap: true
    },
    plugins: [
      typescript({
        target: 'ES2020',
        module: 'ESNext',
        noEmitHelpers: true,
        importHelpers: false,
        declaration: false
      }),
      terser({
        compress: {
          drop_console: ['log', 'info'],
          drop_debugger: true,
          pure_funcs: ['console.log', 'console.info'],
          passes: 2
        },
        mangle: {
          properties: {
            regex: /^_/
          }
        },
        format: {
          comments: false
        }
      })
    ],
    external: [] // No external dependencies
  },
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.d.ts',
      format: 'esm'
    },
    plugins: [dts()]
  }
] 