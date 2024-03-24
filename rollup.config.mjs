/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-var-requires */
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';
import external from 'rollup-plugin-peer-deps-external';
import pkg from './package.json' assert { type: 'json' };

/**
* Comment with library information to be appended in the generated bundles.
*/
const banner = `/**
* ${pkg.name} ${pkg.version}
* (c) ${pkg.author.name} ${pkg.author.email}
* Released under the ${pkg.license} License.
*/
`.trim();

export default [
    {
        input: './src/index.ts',
        output: [
            {
                banner,
                file: './dist/esm/index.js',
                format: 'esm',
                sourcemap: true
            },
            {
                file: pkg.module,
                format: 'esm',
                sourcemap: true,
                plugins: [terser()]
            },
            {
                banner,
                file: './dist/system/index.js',
                format: 'system',
                sourcemap: true
            },
            {
                file: pkg.exports.default.system,
                format: 'system',
                sourcemap: true,
                plugins: [terser()]
            },
            {
                banner,
                file: pkg.main,
                format: 'commonjs',
                sourcemap: true
            },
            {
                file: pkg.browser,
                format: 'umd',
                name: 'DAVINCI_CSV',
                sourcemap: true
            }
        ],
        plugins: [
            commonjs(),
            external(),
            resolve(),
            typescript({ tsconfig: './tsconfig.json', exclude: ['**/*.spec.ts'] })
        ]
    },
    {
        input: 'dist/esm/types/index.d.ts',
        output: [{ file: pkg.types, format: "esm" }],
        plugins: [dts()],
    }
]