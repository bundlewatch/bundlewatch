import jsonpack from 'jsonpack/main'

const createURL = ({ results, bundlesizeServiceHost }) => {
    // TODO strip out data, etc
    // TODO url shortern service?
    const packedJSON = jsonpack.pack(results)
    const urlResultData = encodeURIComponent(packedJSON)
    const url = `${bundlesizeServiceHost}/results?d=${urlResultData}`
    return url
}

export default createURL
