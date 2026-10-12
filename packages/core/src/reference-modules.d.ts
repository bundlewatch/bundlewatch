// The original 0.x dependencies, installed as dev dependencies so tests can
// check that the ports behave identically. Neither ships its own types.

declare module 'bytes' {
  const bytes: {
    format(value: number): string | null;
    parse(value: string | number): number | null;
  };
  export default bytes;
}

declare module 'jsonpack-v1/main.js' {
  const jsonpack: {
    pack(value: unknown): string;
    unpack(value: string): unknown;
  };
  export default jsonpack;
}
