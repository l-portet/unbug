import DevToolsProtocol from 'devtools-protocol';

export type ConsoleMixedType =
  | DevToolsProtocol.Runtime.RemoteObject['subtype']
  | DevToolsProtocol.Runtime.RemoteObject['type'];

export type ConsolePropertyData = {
  name: string;
  value?: DevToolsProtocol.Runtime.RemoteObject;
};
