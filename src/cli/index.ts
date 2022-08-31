import fs from 'fs';
import path from 'path';
import { program } from 'commander';

import { addConfig } from '../config';
import { PackageJson } from 'types-package-json';

class CLI {
  private static _instance: CLI | null = null;
  protected package: Partial<PackageJson> | null = null;

  constructor() {
    if (CLI._instance) {
      throw new Error("CLI can't be instantiated more than once.");
    }
    CLI._instance = this;
  }

  parse() {
    this.readPackageJson();
    program
      .name(this.package.name)
      .description(this.package.description)
      .version(this.package.version)
      .argument('<file>', 'Entry file path to debug')
      .option(
        '-r,--runtime <runtime>',
        'Javascript runtime, can be node, deno or bun.'
      )
      .option(
        '-a,--runtime-args <runtime-args>',
        'Args to pass to runtime (ex: "--experimental-fetch" for node)'
      )
      .option(
        '-p,--persist',
        'Force context peristence & keep the process alive'
      );

    program.parse();
    const [file] = program.args;
    const options = program.opts();

    addConfig({
      entryPoint: file,
      ...options,
    });
  }

  readPackageJson() {
    if (this.package) {
      return;
    }
    const buffer = fs.readFileSync(
      path.resolve(__dirname, '../../../package.json')
    );
    this.package = JSON.parse(buffer.toString());
  }
}

export default new CLI();
