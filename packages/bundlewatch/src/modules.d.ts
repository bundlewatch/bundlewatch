// glob@7 ships no types. Only the part bundlewatch uses.
declare module 'glob' {
    const glob: {
        sync(pattern: string, options?: { cwd?: string }): string[]
    }
    export default glob
}
