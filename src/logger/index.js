import chalk from 'chalk'

const stdout = console.log // eslint-disable-line no-console
const stderr = console.error // eslint-disable-line no-console

const log = message => {
    stdout(message)
}

const warn = message => {
    stdout(chalk.yellow(`[WARNING] ${message}`))
}

const error = (messsage, errorStack) => {
    if (errorStack) {
        stdout(errorStack)
    }
    stderr(chalk.red(`[ERROR] ${messsage}`))
}

export default {
    log,
    warn,
    error,
}
