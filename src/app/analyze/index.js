import analyzeFiles from './analyzeFiles'

// const getGlobalMessage = ({
//     results,
//     totalSize,
//     totalSizeMaster,
//     totalMaxSize,
// }) => {
//     let globalMessage
//
//     let failures = results.filter(result => !!result.fail).length
//
//     if (results.length === 1) {
//         const { message } = results[0]
//         globalMessage = message
//     } else if (failures === 1) {
//         // multiple files, one failure
//         const result = results.find(message => message.fail)
//         const { message } = result
//
//         globalMessage = message
//     } else if (failures) {
//         // multiple files, multiple failures
//         const change = totalSize - totalSizeMaster
//         const prettyChange =
//             change === 0
//                 ? 'no change'
//                 : change > 0
//                     ? `+${bytes(change)}`
//                     : `-${bytes(Math.abs(change))}`
//
//         globalMessage = `${failures} out of ${
//             results.length
//         } bundles are too big! (${prettyChange})`
//     } else {
//         // multiple files, no failures
//         const prettySize = bytes(totalSize)
//         const prettyMaxSize = bytes(totalMaxSize)
//         const change = totalSize - totalSizeMaster
//         const prettyChange =
//             change === 0
//                 ? 'no change'
//                 : change > 0
//                     ? `+${bytes(change)}`
//                     : `-${bytes(Math.abs(change))}`
//
//         globalMessage = `Total bundle size is ${prettySize}/${prettyMaxSize} (${prettyChange})`
//     }
//     return globalMessage
// }

const analyze = ({
    currentBranchFileDetails,
    baseBranchFileDetails,
    baseBranchName,
}) => {
    const fileResults = analyzeFiles({
        currentBranchFileDetails,
        baseBranchFileDetails,
        baseBranchName,
    })

    // TODO: determine overall stats
    return {
        isFail: fileResults.reduce((isFail, fileResult) => {
            return isFail || fileResult.isFail
        }, false),
        fullResults: fileResults,
    }
}

export default analyze
