declare module 'jsonpack/main.js' {
  const jsonpack: {
    pack(value: unknown): string;
    unpack(value: string): unknown;
  };
  export default jsonpack;
}
