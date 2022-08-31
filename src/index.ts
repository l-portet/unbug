// Runner here
// import cli from '@cli/index.ts';
import tui from './tui';
import config from './config';
import core from './core';
import cli from './cli/index';
import { CDPAdapterOutput } from './core/adapter';

class Orchestrator {
  private static _instance: Orchestrator | null = null;

  constructor() {
    if (Orchestrator._instance) {
      throw new Error("Orchestrator can't be instantiated more than once.");
    }
    Orchestrator._instance = this;
  }

  async run() {
    cli.parse();
    tui.start();

    tui.on('start', () => console.log('start'));
    tui.on('quit', this.handleQuit);
    core.on('output', this.handleCDPOutput);

    await core.runChildProcess();
  }

  handleQuit() {
    core.killChildProcess();
    process.exit(0);
  }

  handleCDPOutput(output: CDPAdapterOutput) {
    tui.addItem(output);
  }
}

new Orchestrator().run();
