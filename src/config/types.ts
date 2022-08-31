export type ConfigRuntime = 'node' | 'deno' | 'bun';

export type Config = {
  cwd: string;
  entryPoint: string;
  runtime: ConfigRuntime;
  runtimeArgs: string;
};
