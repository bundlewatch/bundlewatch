const createURL = ({ results, bundlesizeServiceHost }) => {
    // TODO strip out data, etc
    // TODO 'minify' data
    // TODO url shortern service?
    const urlResultData = encodeURIComponent(JSON.stringify(results))
    const url = `${bundlesizeServiceHost}/results?d=${urlResultData}`
    return url
}

export default createURL
