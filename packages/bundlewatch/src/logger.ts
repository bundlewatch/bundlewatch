import { styleText } from 'node:util'

type Format = Parameters<typeof styleText>[0]

// Like chalk@4 in 0.x: colors only on terminals, so piped and captured
// output stays plain, unless FORCE_COLOR asks for them.
const useColor = (stream: NodeJS.WriteStream): boolean => {
    const { env } = process
    if ('FORCE_COLOR' in env) {
        return env.FORCE_COLOR !== '0' && env.FORCE_COLOR !== 'false'
    }
    if ('NO_COLOR' in env || 'NODE_DISABLE_COLORS' in env) return false
    return Boolean(stream.isTTY)
}

export const paint = (
    format: Format,
    text: string,
    stream: NodeJS.WriteStream = process.stdout,
): string =>
    useColor(stream) ? styleText(format, text, { validateStream: false }) : text

const stdout = (message: unknown): void => console.log(message)
const stderr = (message: unknown): void => console.error(message)

export const logger = {
    log(message: string): void {
        stdout(message)
    },
    info(message: string): void {
        stdout(paint('cyan', `[INFO] ${message}`))
    },
    warn(message: string): void {
        stdout(paint('yellow', `[WARNING] ${message}`))
    },
    error(message: string, error?: unknown): void {
        if (error) stdout(error)
        stderr(paint('red', `[ERROR] ${message}`, process.stderr))
    },
    fatal(message: string, error?: unknown): void {
        if (error) stdout(error)
        stderr(paint(['black', 'bgRed'], `[FATAL] ${message}`, process.stderr))
    },
    debug(error: unknown): void {
        if (!process.env.DEBUG) return
        const message = error instanceof Error ? error.message : String(error)
        stdout(paint('greenBright', `[DEBUG] ${message}`))
        stderr(error)
    },
}

export type Logger = typeof logger
