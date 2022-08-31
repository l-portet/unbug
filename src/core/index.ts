import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import config from '../config';
import adapter, { CDPAdapter } from './adapter';
import { EventEmitter } from 'events';

class Core extends EventEmitter {
  private static _instance: Core | null = null;
  private wsUrl: string;
  private adapter: CDPAdapter = adapter;
  private spawned: ChildProcessWithoutNullStreams;

  constructor() {
    super();
    if (Core._instance) {
      throw new Error("Core can't be instantiated more than once.");
    }
    Core._instance = this;
  }

  async runChildProcess() {
    const runtimeArgs = config.runtimeArgs.split(' ').filter(p => p);
    this.spawned = spawn(config.runtime, [
      '--inspect-brk',
      ...runtimeArgs,
      config.entryPoint,
    ]);
    // this.spawned.stdout.on('data', chunk => {
    //   console.log('stdout: ' + chunk.toString());
    // });
    // this.spawned.stderr.on('data', chunk => {
    //   console.log('stderr: ' + chunk.toString());
    // });

    await this.resolveWsUrl();
    this.establishCDPCommunication();
  }

  killChildProcess() {
    this.spawned.kill();
  }

  resolveWsUrl(): Promise<void> {
    return new Promise(resolve => {
      const handleStderr = chunk => {
        const line = chunk.toString();

        if (line.includes('address already in use')) {
          throw new Error(
            `Unable to inspect node process because another inspector is already running.\n` +
              `This command might solve it: lsof -n -i:9229 | grep LISTEN | awk '{ print $2 }' | uniq | xargs kill -9\n` +
              `(original error: ${line})`
          );
        }

        const wsUrl = this.parseWsUrl(line);
        if (wsUrl === null) {
          return;
        }
        this.wsUrl = wsUrl;
        this.spawned.stderr.off('data', handleStderr);
        resolve();
      };

      this.spawned.stderr.on('data', handleStderr);
    });
  }

  parseWsUrl(str): string | null {
    const wsRegex =
      /(ws|wss):\/\/([\w_-]+(?:(?:\.[\w_-]+)+))([\w.,@?^=%&:\/~+#-]*[\w@?^=%&\/~+#-])/;
    const matches = str.match(wsRegex);

    if (!matches) {
      return null;
    }
    return matches[0];
  }

  async establishCDPCommunication() {
    await this.adapter.init(this.wsUrl);
    this.emit('start');
    this.adapter.proxyEmit((event, payload) => this.emit(event, payload));
    await this.adapter.start();
  }
}

export default new Core();
