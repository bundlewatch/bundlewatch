// Command-line parsing with the rules of commander@5, which 0.x used. Every
// option there was declared as `--name [value]`: the value is optional, and
// without one the option is `true`. `util.parseArgs` has no optional values.

export const VALUE_OPTIONS = ['config', 'max-size', 'compression', 'normalize'] as const;

type ValueOption = (typeof VALUE_OPTIONS)[number];

export type ParsedArgs = {
  values: Partial<Record<ValueOption, string | true>> & {
    help?: true;
    version?: true;
  };
  positionals: string[];
};

export class ArgumentError extends Error {
  /** The command that prints the relevant usage. */
  readonly helpCommand: string;

  constructor(message: string, helpCommand = 'bundlewatch --help') {
    super(message);
    this.name = 'ArgumentError';
    this.helpCommand = helpCommand;
  }
}

const isValueOption = (name: string): name is ValueOption =>
  (VALUE_OPTIONS as readonly string[]).includes(name);

export const parseCliArgs = (argv: string[]): ParsedArgs => {
  const values: ParsedArgs['values'] = {};
  const positionals: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i] as string;
    if (arg === '--') {
      positionals.push(...argv.slice(i + 1));
      break;
    }
    if (arg === '-h' || arg === '--help') {
      values.help = true;
      continue;
    }
    if (arg === '-V' || arg === '--version') {
      values.version = true;
      continue;
    }
    if (!arg.startsWith('-') || arg === '-') {
      positionals.push(arg);
      continue;
    }

    const [flag = '', inline] = arg.split(/=(.*)/s);
    const name = flag.replace(/^--/, '');
    if (!flag.startsWith('--') || !isValueOption(name)) {
      throw new ArgumentError(`unknown option '${flag}'`);
    }
    if (inline !== undefined) {
      values[name] = inline;
      continue;
    }
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith('-')) {
      values[name] = next;
      i++;
    } else {
      values[name] = true;
    }
  }

  return { values, positionals };
};

export const UPDATE_MAX_SIZES = 'update-max-sizes' as const;

export type UpdateMaxSizesArgs = {
  config?: string;
  headroom?: string;
  write: boolean;
  help: boolean;
};

const fail: (message: string) => never = (message) => {
  throw new ArgumentError(message, `bundlewatch ${UPDATE_MAX_SIZES} --help`);
};

/**
 * Options of `bundlewatch update-max-sizes`. It has no 0.x behavior to keep,
 * so values are required and `--write` never takes the next argument.
 */
export const parseUpdateMaxSizesArgs = (argv: string[]): UpdateMaxSizesArgs => {
  const args: UpdateMaxSizesArgs = { write: false, help: false };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i] as string;
    // Package managers may pass on the `--` of `npm run script -- --write`.
    if (arg === '--') continue;
    if (arg === '-h' || arg === '--help') {
      args.help = true;
      continue;
    }
    if (arg === '--write') {
      args.write = true;
      continue;
    }
    if (!arg.startsWith('-')) {
      fail(
        `${UPDATE_MAX_SIZES} takes no file globs: it reads files and maxSize values from your configuration`,
      );
    }

    const [flag = '', inline] = arg.split(/=(.*)/s);
    if (flag === '--write') fail('--write takes no value');
    if (flag !== '--config' && flag !== '--headroom') fail(`unknown option '${flag}'`);
    const next = argv[i + 1];
    const value = inline ?? (next?.startsWith('-') ? undefined : next);
    if (!value) fail(`${flag} needs a value`);
    if (inline === undefined) i++;
    args[flag === '--config' ? 'config' : 'headroom'] = value;
  }

  return args;
};
