import defaults from './defaults';
import { Config } from './types';
function mergeConfig(
  custom: Partial<Config> = {},
  base: Config = defaults
): Config {
  for (const key of Object.keys(custom)) {
    if (!base.hasOwnProperty(key) || typeof custom[key] !== 'object') {
      base[key] = custom[key];
    } else {
      mergeConfig(custom[key], base[key]);
    }
  }
  return base;
}

let config: Config = mergeConfig();

export function addConfig(newConfig: Partial<Config> = {}) {
  mergeConfig(newConfig, config);
}

export { Config };
export default config;
