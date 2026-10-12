// Port of the parts of bytes@3.1.2 that bundlewatch uses, with its default
// options. Sizes formatted here appear in GitHub statuses and results pages,
// so the output must stay identical. bytes.test.ts compares against the
// original package.

const UNITS = {
    b: 1,
    kb: 1 << 10,
    mb: 1 << 20,
    gb: 1 << 30,
    tb: 1024 ** 4,
    pb: 1024 ** 5,
} as const

const DECIMALS = /(?:\.0*|(\.[^0]+)0+)$/
const PARSE = /^((-|\+)?(\d+(?:\.\d+)?)) *(kb|mb|gb|tb|pb)$/i

/** `1536` → `'1.5KB'`. Non-finite values format to `null`, like bytes@3. */
export const formatBytes = (value: number): string | null => {
    if (!Number.isFinite(value)) {
        return null
    }
    const magnitude = Math.abs(value)
    let unit: keyof typeof UNITS = 'b'
    if (magnitude >= UNITS.pb) unit = 'pb'
    else if (magnitude >= UNITS.tb) unit = 'tb'
    else if (magnitude >= UNITS.gb) unit = 'gb'
    else if (magnitude >= UNITS.mb) unit = 'mb'
    else if (magnitude >= UNITS.kb) unit = 'kb'

    const formatted = (value / UNITS[unit]).toFixed(2).replace(DECIMALS, '$1')
    return formatted + unit.toUpperCase()
}

/** `'100kB'` → `102400`. Unparseable strings return `null`, like bytes@3. */
export const parseBytes = (value: string | number): number | null => {
    if (typeof value === 'number') {
        return Number.isNaN(value) ? null : value
    }
    const match = PARSE.exec(value)
    const amount = match
        ? Number.parseFloat(match[1] ?? '')
        : Number.parseInt(value, 10)
    if (Number.isNaN(amount)) {
        return null
    }
    const unit = (match?.[4]?.toLowerCase() ?? 'b') as keyof typeof UNITS
    return Math.floor(UNITS[unit] * amount)
}
