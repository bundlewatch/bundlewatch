import fs from 'fs'
import gzip from 'gzip-size'
import logger from '../../logger'

const getBrotliSize = data => {
    let brotli
    try {
        brotli = require('brotli-size') // eslint-disable-line global-require
    } catch (e) {
        throw new Error(
            `'brotli-size' package has not been installed, please install package to use this compression type`,
        )
    }
    return brotli.sync(data)
}

const getSize = ({ filePath, compression }) => {
    let data
    try {
        data = fs.readFileSync(filePath, 'utf8')
    } catch (error) {
        logger.error(`Could not read file: ${filePath}}`, error)
        return null
    }

    let size
    switch (compression) {
        case 'gzip':
            size = gzip.sync(data)
            break
        case 'brotli':
            size = getBrotliSize(data)
            break
        case 'none':
        default:
            size = Buffer.byteLength(data)
    }

    return size
}

export default getSize
