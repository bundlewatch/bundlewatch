// Results pages render attacker-controlled data (anyone can craft a
// `/results?d=` link). The old Mustache templates escaped every `{{ }}`;
// this tag keeps that guarantee by escaping every interpolated value unless
// it is itself the output of `html`.

const ESCAPES: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
}

export const escapeHtml = (value: string): string =>
    value.replace(/[&<>"']/g, (char) => ESCAPES[char] ?? char)

export class SafeHtml {
    readonly value: string

    constructor(value: string) {
        this.value = value
    }

    toString(): string {
        return this.value
    }
}

const render = (value: unknown): string => {
    if (value instanceof SafeHtml) {
        return value.value
    }
    if (Array.isArray(value)) {
        return value.map(render).join('')
    }
    // Like Mustache: missing values render as nothing.
    if (value === null || value === undefined || value === false) {
        return ''
    }
    return escapeHtml(String(value))
}

export const html = (
    strings: TemplateStringsArray,
    ...values: unknown[]
): SafeHtml => {
    let out = strings[0] ?? ''
    for (let i = 0; i < values.length; i++) {
        out += render(values[i]) + (strings[i + 1] ?? '')
    }
    return new SafeHtml(out)
}
