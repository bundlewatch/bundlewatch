import bytes from 'bytes'

const getCompressionText = compression => {
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

    uniqueFilePaths.forEach(filePath => {
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
                isNew: false,
                isRemoved: true,
                isFail: false,
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
                isFail: true,
            })
            return
        }

        const { size, maxSize, compression } = currentBranchFile

        let isFail = false
        let message = `${filePath}: ${bytes(size)} `

        const prettySize = maxSize === Infinity ? 'Infinity' : bytes(maxSize)

        if (size > maxSize) {
            isFail = true
            message += `> maxSize ${prettySize} `
        } else {
            message += `< maxSize ${prettySize} `

            if (baseBranchFile) {
                const diff = size - baseBranchFile.size

                if (diff < 0) {
                    message += `(${bytes(
                        Math.abs(diff),
                    )} smaller than ${baseBranchName}) `
                } else if (diff > 0) {
                    message += `(${bytes(diff)} larger than ${baseBranchName}) `
                } else {
                    message += `(no difference) `
                }
            }
        }

        message += `${getCompressionText(compression)}`

        results.push({
            filePath,
            message,
            isNew: !baseBranchFile,
            isRemoved: false,
            isFail,
            size,
            baseBranchSize: baseBranchFile ? baseBranchFile.size : 0,
            maxSize,
        })
    })

    return results
}

export default analyzeFiles
