import typescript from '@rollup/plugin-typescript'
import dts from 'rollup-plugin-dts'
import terser from '@rollup/plugin-terser'

export default [
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.js',
      format: 'esm',
      sourcemap: true,
      inlineDynamicImports: true
    },
    plugins: [
      typescript({
        target: 'ES2020',
        module: 'ESNext',
        noEmitHelpers: true,
        importHelpers: false,
        declaration: false,
        removeComments: true
      }),
      terser({
        compress: {
          drop_console: false, // Keep console for debug functionality
          drop_debugger: true,
          passes: 1, // Safer default for build stability
          unsafe: false, // Disable unsafe optimizations
          unsafe_comps: false,
          unsafe_math: false,
          unsafe_proto: false,
          unsafe_regexp: false,
          // Removed unsafe_arrows and unsafe_methods
          booleans_as_integers: true,
          collapse_vars: true,
          dead_code: true,
          evaluate: true,
          hoist_funs: true,
          hoist_props: true,
          hoist_vars: true,
          inline: true, // Back to safe default
          join_vars: true,
          loops: true,
          negate_iife: true,
          properties: true,
          reduce_funcs: true,
          reduce_vars: true,
          sequences: true,
          side_effects: true,
          switches: true,
          typeofs: true,
          unused: true,
          conditionals: true,
          if_return: true,
          
          toplevel: true
        },
        mangle: {
          toplevel: true,
          properties: {
            regex: /^_/
          }
        },
        format: {
          comments: false,
          semicolons: false
        }
      })
    ],
    external: [], // No external dependencies
    treeshake: {
      moduleSideEffects: false,
      propertyReadSideEffects: false,
      tryCatchDeoptimization: false,
      unknownGlobalSideEffects: false
    }
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