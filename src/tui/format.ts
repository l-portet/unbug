import DevToolsProtocol from 'devtools-protocol';
import chalk from 'chalk';
import { ConsoleMixedType } from './types';

export function formatPreview(
  mixedType: ConsoleMixedType,
  data: DevToolsProtocol.Runtime.RemoteObject
): string {
  switch (mixedType) {
    case 'object':
    case 'array':
      return formatObjectPreview(mixedType, data);
    default:
      return formatVariable(mixedType, data?.value, data?.description);
  }
}

export function formatObjectPreview(
  mixedType: ConsoleMixedType,
  data: DevToolsProtocol.Runtime.RemoteObject
): string {
  if (!data.preview) {
    return data.description;
  }

  const { description, properties } = data.preview;

  const isArray = mixedType === 'array';
  const prefix = description === 'Object' || isArray ? '' : `${description} `;
  const opener = isArray ? '[' : '{';
  const closer = isArray ? ']' : '}';

  const sortedProperties = [...properties].sort(
    sortProperty(property => property.name)
  );

  const propertiesStr = sortedProperties.map(property =>
    formatInlineObjectProperty(property, isArray)
  );

  const value = properties.length
    ? `${opener}${propertiesStr.join(', ')}${closer}`
    : opener + closer;

  return prefix + value;
}

// This allows us to format this kind of preview:
// > {foo: 42, bar: 'plop', baz: []}
export function formatInlineObjectProperty(
  property: DevToolsProtocol.Runtime.PropertyPreview,
  isArray: boolean
) {
  const { name, value } = property;
  const type = property.subtype || property.type;
  let valueStr = formatVariable(type, value);

  if (isArray) {
    return `${valueStr}`;
  } else {
    return `${chalk.hex('#AAA')(name)}: ${valueStr}`;
  }
}

export function formatVariable(
  type: string,
  value: any,
  description: string = ''
): string {
  if (!type) {
    type = 'undefined';
  }
  switch (type) {
    case 'undefined':
      return chalk.dim('undefined');
    case 'null':
      return chalk.magenta('null');
    case 'boolean':
      return chalk.green(value);
    case 'number':
      return chalk.green(value);
    case 'string':
      return chalk.cyan(`'${value}'`);
    case 'function':
      const truncatedDescription = description.includes('\n')
        ? description.split('\n')[0] + '...'
        : description;
      return chalk.yellow('ƒ') + ' ' + chalk.hex('#AAA')(truncatedDescription);
    // TODO: Better object & array preview
    case 'object':
      return '{}';
    case 'array':
      return value;
    // TODO: Support other types
    default:
      return chalk.red(`<unsupported (${type})>`);
  }
}

export function sortProperty(getName) {
  return function (a, b) {
    const getPriority = name => {
      if (name.startsWith('[[')) {
        return 4;
      }
      if (name.startsWith('__')) {
        return 3;
      }
      if (name.startsWith('_')) {
        return 2;
      }
      if (name.startsWith('constructor')) {
        return 1;
      }
      return 0;
    };
    const prioA = getPriority(getName(a));
    const prioB = getPriority(getName(b));
    if (prioA < prioB) {
      return -1;
    } else if (prioA > prioB) {
      return 1;
    }
    return 0;
  };
}
