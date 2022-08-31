import DevToolsProtocol from 'devtools-protocol';

export type RemoteObjectResolver = (
  id: string
) => Promise<DevToolsProtocol.Runtime.GetPropertiesResponse>;

export interface CDPAdapterOutput
  extends DevToolsProtocol.Runtime.ConsoleAPICalledEvent {
  data: DevToolsProtocol.Runtime.RemoteObject;
  resolveRemoteObject: RemoteObjectResolver;
}
