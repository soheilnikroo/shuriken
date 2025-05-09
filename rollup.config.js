import path from 'path';
import fs from 'fs';
import alias from '@rollup/plugin-alias';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import { terser } from 'rollup-plugin-terser';
import pkgEsbuild from 'rollup-plugin-esbuild';
import analyze from 'rollup-plugin-analyzer';

const esbuild = pkgEsbuild.default || pkgEsbuild;

const ROOT_DIR = process.cwd();
const PACKAGES_DIR = path.resolve(ROOT_DIR, 'packages');

const packageNames = fs.existsSync(PACKAGES_DIR)
  ? fs.readdirSync(PACKAGES_DIR).filter(name => {
      const pkgPath = path.join(PACKAGES_DIR, name);
      return (
        fs.statSync(pkgPath).isDirectory() &&
        (fs.existsSync(path.join(pkgPath, 'index.ts')) ||
          fs.existsSync(path.join(pkgPath, 'index.js')))
      );
    })
  : [];

const input = packageNames.reduce((map, name) => {
  const entryTs = path.join(PACKAGES_DIR, name, 'index.ts');
  const entryJs = path.join(PACKAGES_DIR, name, 'index.js');
  if (fs.existsSync(entryTs)) {
    map[name] = entryTs;
  } else if (fs.existsSync(entryJs)) {
    map[name] = entryJs;
  }
  return map;
}, {});

const externalFn = id => {
  if (id.startsWith('@packages/') || packageNames.some(name => id === `@${name}`)) {
    return true;
  }
  const pkg = require('./package.json');
  const deps = Object.keys(pkg.dependencies || {});
  return deps.some(dep => id === dep || id.startsWith(`${dep}/`));
};

const pathsFn = id => {
  if (id.startsWith('@packages/')) {
    const parts = id.split('/');
    const packageName = parts[1];
    return `./packages/${packageName}/index.js`;
  } else if (packageNames.some(name => id === `@${name}`)) {
    const packageName = id.slice(1);
    return `./packages/${packageName}/index.js`;
  }
  return id;
};

function packagePlugins() {
  return [
    alias({
      entries: [
        { find: '@', replacement: path.resolve(ROOT_DIR, 'src') },
        { find: '@packages', replacement: PACKAGES_DIR },
        { find: '@groot', replacement: path.resolve(PACKAGES_DIR, 'groot') },
        { find: '@doczilla', replacement: path.resolve(PACKAGES_DIR, 'doczilla') },
        { find: '@mohitban', replacement: path.resolve(PACKAGES_DIR, 'mohitban') },
        { find: '@ciknight', replacement: path.resolve(PACKAGES_DIR, 'ciknight') },
        { find: '@jarvis', replacement: path.resolve(PACKAGES_DIR, 'jarvis') },
      ],
    }),
    resolve({
      extensions: ['.ts', '.js', '.json'],
      preferBuiltins: true,
    }),
    commonjs({
      ignore: ['ts-node'],
    }),
    json(),
    esbuild({
      include: /\.[jt]s$/,
      sourceMap: true,
      target: 'es2020',
      tsconfig: path.resolve(ROOT_DIR, 'tsconfig.json'),
      minify: true,
    }),
    terser(),
    analyze({ summaryOnly: true }),
  ];
}

function mainPlugins() {
  return [
    alias({
      entries: [{ find: '@', replacement: path.resolve(ROOT_DIR, 'src') }],
    }),
    resolve({
      extensions: ['.ts', '.js', '.json'],
      preferBuiltins: true,
    }),
    commonjs({
      ignore: ['ts-node'],
    }),
    json(),
    esbuild({
      include: /\.[jt]s$/,
      sourceMap: true,
      target: 'es2020',
      tsconfig: path.resolve(ROOT_DIR, 'tsconfig.json'),
      minify: true,
    }),
    terser(),
    analyze({ summaryOnly: true }),
  ];
}

const packageConfig = {
  input,
  output: {
    dir: path.resolve(ROOT_DIR, 'dist/packages'),
    format: 'cjs',
    sourcemap: true,
    preserveModules: true,
    preserveModulesRoot: 'packages',
    entryFileNames: '[name]/index.js',
    chunkFileNames: 'chunks/[name]-[hash].js',
    exports: 'auto',
  },
  plugins: packagePlugins(),
};

const mainConfig = {
  input: 'src/index.ts',
  external: externalFn,
  output: {
    file: 'dist/index.js',
    format: 'cjs',
    sourcemap: true,
    exports: 'named',
    inlineDynamicImports: true,
    paths: pathsFn,
  },
  plugins: mainPlugins(),
};

const binConfig = {
  input: 'src/bin/shuriken.ts',
  external: externalFn,
  output: {
    dir: 'dist/bin',
    format: 'cjs',
    sourcemap: true,
    entryFileNames: 'shuriken.js',
    banner: '#!/usr/bin/env node',
    paths: pathsFn,
  },
  plugins: mainPlugins(),
};

const configs = {
  packages: packageConfig,
  main: mainConfig,
  bin: binConfig,
};

const target = process.env.BUILD_TARGET;

export default target ? configs[target] : Object.values(configs);
