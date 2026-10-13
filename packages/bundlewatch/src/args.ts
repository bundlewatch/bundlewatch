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
  constructor(message: string) {
    super(message);
    this.name = 'ArgumentError';
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
