import { hmrPlugin } from '@web/dev-server-hmr';

export default {
  rootDir: '.',
  port: 8000,
  open: false,
  watch: true,
  nodeResolve: false, // bare specifiers are resolved by the in-page import map
  plugins: [
    hmrPlugin()
  ]
};
