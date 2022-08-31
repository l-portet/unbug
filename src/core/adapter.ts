// CDP = Chrome Devtools Protocol
import { WebSocket } from 'ws';
import DevToolsProtocol from 'devtools-protocol';
import DevToolsProtocolProxy from 'devtools-protocol/types/protocol-proxy-api';
import * as rpc from 'noice-json-rpc';
import { RemoteObjectResolver, CDPAdapterOutput } from './types';

class CDPAdapter {
  private url: string;
  private ws: WebSocket;
  private api: DevToolsProtocolProxy.ProtocolApi;
  private _emit: Function;

  async init(url) {
    this.url = url;
    this.ws = new WebSocket(this.url);
    this.api = new rpc.Client(this.ws).api();

    this.registerListeners();
    await this.api.Runtime.enable();
  }

  async start() {
    await this.api.Runtime.runIfWaitingForDebugger();
  }

  proxyEmit(fn) {
    this._emit = fn;
  }

  registerListeners() {
    this.api.Runtime.on('consoleAPICalled', context => {
      this.emitOutput(context);
    });
    this.api.Runtime.on('executionContextDestroyed', () => this._emit('end'));
    // TODO: Register listener for other events (ex: exceptions)
  }

  emitOutput(payload: DevToolsProtocol.Runtime.ConsoleAPICalledEvent) {
    const resolveRemoteObject: RemoteObjectResolver = async objectId =>
      await this.api.Runtime.getProperties({
        objectId,
        ownProperties: true,
      });
    this._emit('output', { ...payload, resolveRemoteObject });
  }
}

export { RemoteObjectResolver, CDPAdapterOutput };
export { CDPAdapter };
export default new CDPAdapter();
