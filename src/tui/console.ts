import path from 'path';
import DevToolsProtocol from 'devtools-protocol';
import { v4 as generateId } from 'uuid';
import chalk from 'chalk';

import config from '../config';
import { formatPreview, sortProperty } from './format';

import { CDPAdapterOutput, RemoteObjectResolver } from '@/core/adapter';
import { ConsoleMixedType, ConsolePropertyData } from './types';

export abstract class ConsoleNode {
  public id = generateId();
  public depth: number = 0;
  public isOpened: boolean = false;
  public parent: ConsoleNode;
  public children: ConsoleNode[] = [];
  protected _resolveRemoteObject: RemoteObjectResolver;

  abstract get preview(): string;
  abstract get isOpenable(): boolean;
  abstract get mixedType(): ConsoleMixedType;
  abstract getObjectId(): string;

  constructor(parent: ConsoleNode) {
    this.parent = parent;
  }

  get arrow(): string {
    return this.isOpened ? '▾' : '▸';
  }

  get prefix(): string {
    const blank = ' ';
    const indentSize = 2;
    const padding = blank.repeat(this.depth * indentSize);
    if (!this.isOpenable) {
      return padding + blank.repeat(3);
    }
    return padding + ` ${this.arrow} `;
  }

  get body(): string[] {
    const lines = [this.prefix + this.preview];

    if (!this.isOpenable || !this.isOpened) {
      return lines;
    }

    for (const child of this.children) {
      lines.push(...child.body);
    }

    return lines;
  }

  // TEMP
  debug() {
    // @ts-ignore
    console.log(this.data);
  }

  resolveRemoteObject(
    objectId
  ): Promise<DevToolsProtocol.Runtime.GetPropertiesResponse> {
    if (!this._resolveRemoteObject) {
      if (!this.parent) {
        throw `ConsoleBlock doesn't have a _resolveRemoteObject function.`;
      }
      return this.parent.resolveRemoteObject(objectId);
    } else {
      return this._resolveRemoteObject(objectId);
    }
  }

  async open() {
    if (!this.isOpenable || this.isOpened) {
      return;
    }

    if (this.children.length) {
      this.isOpened = true;
      return;
    }
    const remoteObject = await this.resolveRemoteObject(this.getObjectId());

    // console.log('open!');
    // console.log(JSON.stringify(remoteObject));

    // TODO: Use exceptionDetails ?
    const {
      result = [],
      internalProperties = [],
      privateProperties = [],
    } = remoteObject;

    for (const property of result) {
      this.children.push(
        new ConsoleStandardProperty(this, property, this.depth + 1)
      );
    }
    for (const property of privateProperties) {
      this.children.push(
        new ConsolePrivateProperty(this, property, this.depth + 1)
      );
    }
    for (const property of internalProperties) {
      this.children.push(
        new ConsoleInternalProperty(this, property, this.depth + 1)
      );
    }

    this.children.sort(sortProperty(child => child.data.name));

    this.isOpened = true;
  }

  // TODO: Close all children
  close() {
    if (!this.isOpenable && !this.parent) {
      return;
    }
    if (!this.isOpened) {
      this.parent.close();
      return;
    }

    for (const child of this.children) {
      if (child.isOpened) {
        child.close();
      }
    }
    this.isOpened = false;
  }

  resolveNodeFromLine(line: number): ConsoleNode {
    if (!line--) {
      return this;
    }

    for (const child of this.children) {
      if (line < child.body.length) {
        return child.resolveNodeFromLine(line);
      }
      line -= child.body.length;
    }
  }
}

export abstract class ConsoleProperty extends ConsoleNode {
  protected data: ConsolePropertyData;
  protected type: string;

  constructor(
    parent: ConsoleNode,
    property: ConsolePropertyData,
    depth: number
  ) {
    super(parent);
    this.data = property;
    this.depth = depth;
  }
  get preview(): string {
    const preview: string = formatPreview(this.mixedType, this.data.value);

    return `${chalk.hex('#888')(this.data.name)}: ${preview}`;
  }
  get isOpenable(): boolean {
    return !!this.getObjectId();
  }
  get mixedType(): ConsoleMixedType {
    return this.data.value?.subtype || this.data.value?.type;
  }

  getObjectId(): string {
    return this.data?.value?.objectId || null;
  }
}

export class ConsoleStandardProperty extends ConsoleProperty {
  protected type: string = 'standard';
}

export class ConsolePrivateProperty extends ConsoleProperty {
  protected type: string = 'protected';
}

export class ConsoleInternalProperty extends ConsoleProperty {
  protected type: string = 'internal';
}

export class ConsoleBlock extends ConsoleNode {
  protected timestamp: number;
  protected stackTrace: DevToolsProtocol.Runtime.StackTrace;
  protected executionContextId: number;
  protected type: DevToolsProtocol.Runtime.ConsoleAPICalledEventType;
  protected data: DevToolsProtocol.Runtime.RemoteObject;

  constructor({
    timestamp,
    stackTrace,
    executionContextId,
    type,
    data,
    resolveRemoteObject,
  }: CDPAdapterOutput) {
    super(null);
    this.timestamp = timestamp;
    this.stackTrace = stackTrace;
    this.executionContextId = executionContextId;
    this.type = type as DevToolsProtocol.Runtime.ConsoleAPICalledEventType;
    this.data = data;
    this._resolveRemoteObject = resolveRemoteObject;
  }

  get suffix(): string {
    return `{|}${chalk.hex('#888')(this.trace)}`;
  }

  get preview(): string {
    return formatPreview(this.mixedType, this.data) + this.suffix;
  }

  get mixedType(): ConsoleMixedType {
    return this.data.subtype || this.data.type;
  }

  get trace(): string {
    const [callFrame] = this.stackTrace.callFrames;
    if (!callFrame) {
      return 'anonymous';
    }
    const { url, lineNumber } = callFrame;
    const filePrefix = `file://`;
    let filePath = url;

    if (url.startsWith(filePrefix)) {
      const from = config.cwd;
      const to = url.slice(filePrefix.length);

      filePath = path.relative(from, to);
    }

    return filePath + ':' + lineNumber;
  }

  get isOpenable(): boolean {
    return typeof this.data?.preview !== 'undefined';
  }

  getObjectId(): string {
    return this.data.objectId;
  }
}
