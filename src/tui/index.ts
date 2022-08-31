import DevToolsProtocol from 'devtools-protocol';
import * as blessed from 'blessed';
import { ConsoleNode, ConsoleBlock } from '../tui/console';
import { CDPAdapterOutput } from '@/core/adapter';
import EventEmitter from 'events';

class TUI extends EventEmitter {
  private static _instance: TUI | null = null;
  private screen: blessed.Widgets.Screen;
  private list: blessed.Widgets.ListElement;
  private blocks: ConsoleBlock[] = [];

  constructor() {
    super();
    if (TUI._instance) {
      throw new Error("TUI can't be instantiated more than once.");
    }
    TUI._instance = this;
  }

  get selectedNode(): ConsoleNode {
    // TODO: Contribute to @types
    // @ts-ignore, List.selected missing in type declaration
    const line: number = this.list.selected;

    return this.resolveNodeFromLine(line);
  }

  start() {
    this.initScreen();
    this.initList();
    this.list.focus();
    this.list.select(Infinity);

    // Render the screen.
    this.screen.render();
  }

  initScreen() {
    this.screen = blessed.screen({
      smartCSR: true,
      autoPadding: true,
    });
    this.screen.title = 'Unbug';
    this.screen.key(['escape', 'q', 'C-c'], () => this.emit('quit'));
    this.screen.key(['right', 'left'], (_, key) =>
      this.handleRightLeftKey(key.name)
    );
    this.screen.key(['enter'], (_, key) => this.selectedNode.debug());
  }

  initList() {
    this.list = blessed.list({
      parent: this.screen,
      top: 'top',
      left: 'center',
      width: '100%',
      height: '100%',
      padding: {
        top: 0,
      },
      tags: true,
      mouse: true,
      keys: true,
      vi: true,
      items: [],
      border: {
        type: 'line',
      },
      style: {
        item: {
          fg: 'white',
        },
        selected: {
          bg: 'blue',
        },
      },
      scrollbar: {
        ch: ' ',
        track: {
          bg: 'cyan',
        },
        style: {
          inverse: true,
        },
      },
    });
  }

  addItem(output: CDPAdapterOutput) {
    const { args } = output;
    const payload: CDPAdapterOutput = { ...output };
    delete payload.args;

    for (const arg of args) {
      const item = new ConsoleBlock({ ...payload, data: arg });

      this.blocks.push(item);
    }

    this.updateRender();
  }

  updateRender() {
    const listLines = this.getListLines();
    // TODO: Contribute to @types
    // @ts-ignore: Error in types, this expects a string[]
    this.list.setItems(listLines);

    // @ts-ignore: Error in types, this exists
    this.list.padding.top = Math.max(
      0,
      // @ts-ignore: Error in types, this exists
      this.screen.height - listLines.length - 2
    );
    // IF last row selected, scroll 1
    // @ts-ignore: Error in types, this exists
    // TODO: Solve this
    // if (this.list.selected === listLines.length - 1) {
    //   consoleLog(Math.random().toString().slice(2, 3));
    //   this.list.setScrollPerc(100);
    // }

    this.screen.render();
  }

  getListLines(): string[] {
    return this.blocks.map(item => item.body).flat();
  }

  resolveNodeFromLine(line: number): ConsoleNode {
    let length = 0;
    let offset = 0;

    for (const block of this.blocks) {
      length += block.body.length;
      if (line < length) {
        return block.resolveNodeFromLine(line - offset);
      }
      offset = length;
    }
    return null;
  }

  async handleRightLeftKey(key: string) {
    const node = this.selectedNode;

    if (key === 'right' && node.isOpenable) {
      await node.open();
    } else if (key === 'left') {
      await node.close();
    }
    this.updateRender();
  }
}

export default new TUI();
