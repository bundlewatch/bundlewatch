import bytes from 'bytes'
import glob from 'glob'
import getSize from './getSize'
import logger from '../../logger'

const getLocalFileDetails = ({ files, defaultCompression }) => {
    const fileDetails = {}

    files.forEach((file) => {
        const paths = glob.sync(file.path)
        if (!paths.length) {
            const errorMessage = `There is no matching file for ${file.path}`
            logger.error(errorMessage)
            fileDetails[file.path] = {
                error: errorMessage,
            }
        } else {
            paths.forEach((filePath) => {
                const maxSize = bytes(file.maxSize) || Infinity
                const compression = file.compression || defaultCompression
                const size = getSize({
                    filePath,
                    compression,
                })

                if (size) {
                    fileDetails[filePath] = {
                        maxSize,
                        size,
                        compression,
                    }
                } else {
                    const errorMessage = `Could not read file ${filePath}}`
                    logger.error(errorMessage)
                    fileDetails[filePath] = {
                        error: errorMessage,
                    }
                }
            })
        }
    })

    return fileDetails
}

export default getLocalFileDetails
