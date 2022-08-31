import { Config } from './types';

const defaults: Config = {
  cwd: process.cwd(),
  entryPoint: '.',
  runtime: 'node',
  runtimeArgs: '',
};
export default defaults;
