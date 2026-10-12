// The original 0.x dependency, installed as a dev dependency so tests can
// check that the port behaves identically. It doesn't ship its own types.

declare module 'bytes' {
  const bytes: {
    format(value: number): string | null;
    parse(value: string | number): number | null;
  };
  export default bytes;
}
