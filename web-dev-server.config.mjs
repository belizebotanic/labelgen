import { hmrPlugin, presets } from '@open-wc/dev-server-hmr';

export default {
  rootDir: '.',
  port: 8000,
  open: false,
  // @open-wc/dev-server-hmr requires `watch` to be off — `watch` forces a
  // full page reload on every file change, which defeats the HMR plugin.
  watch: false,
  nodeResolve: false, // bare specifiers are resolved by the in-page import map
  plugins: [
    hmrPlugin({
      include: ['**/*.js'],
      presets: [presets.lit]
    })
  ]
};
