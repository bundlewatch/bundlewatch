import bytes from 'bytes'

export const STATUSES = {
    PASS: 'pass',
    WARN: 'warn',
    FAIL: 'fail',
    REMOVED: 'removed',
}

const getCompressionText = (compression) => {
    return compression === 'none' ? '(no compression)' : `(${compression})`
}

const analyzeFiles = ({
    currentBranchFileDetails,
    baseBranchFileDetails,
    baseBranchName,
}) => {
    const uniqueFilePaths = new Set([
        ...Object.keys(currentBranchFileDetails),
        ...Object.keys(baseBranchFileDetails),
    ])

    const results = []

    uniqueFilePaths.forEach((filePath) => {
        const currentBranchFile = currentBranchFileDetails[filePath]
        const baseBranchFile = baseBranchFileDetails[filePath]

        if (!currentBranchFile) {
            // baseBranchFile must exist
            results.push({
                filePath,
                message: `${filePath}: File removed (${bytes(
                    baseBranchFile.size,
                )} smaller than ${baseBranchName}) ${getCompressionText(
                    baseBranchFile.compression,
                )}`,
                status: STATUSES.REMOVED,
                size: 0,
                baseBranchSize: baseBranchFile.size,
                maxSize: 0,
            })
            return
        }

        if (currentBranchFile.error) {
            results.push({
                filePath,
                error: currentBranchFile.error,
                status: 'fail',
            })
            return
        }

        const { size, maxSize, compression } = currentBranchFile

        let status
        let message = `${bytes(size)} `

        const prettySize = maxSize === Infinity ? 'Infinity' : bytes(maxSize)

        if (size > maxSize) {
            status = STATUSES.FAIL
            message += `> ${prettySize} `
        } else {
            status = STATUSES.PASS
            message += `< ${prettySize} `

            if (baseBranchFile) {
                const diff = size - baseBranchFile.size

                if (diff < 0) {
                    message += `(${bytes(
                        Math.abs(diff),
                    )} smaller than ${baseBranchName}) `
                } else if (diff > 0) {
                    message += `(${bytes(diff)} larger than ${baseBranchName}) `
                    // TODO: add in threshold for STATUSES.WARN
                    // STATUSES.WARN
                } else {
                    message += `(no difference) `
                }
            }
        }

        message += `${getCompressionText(compression)}`

        results.push({
            filePath,
            message,
            status,
            size,
            baseBranchSize: baseBranchFile ? baseBranchFile.size : 0,
            maxSize,
        })
    })

    return results
}

export default analyzeFiles
