import type { ResultsData } from '../validators.ts'

// `d` parameters of results links packed by jsonpack 1.1.5, the version
// 0.x CLIs use. Kept as captured strings so the tests don't depend on
// jsonpack 1.x.

/**
 * Shaped like bundlewatch@0.4.2 output: messages removed, maxSize Infinity
 * for a file without a configured maxSize, an error entry, a removed file,
 * and markup in user-controlled strings. Packed with jsonpack 1.1.5's
 * `pack(CLI_0X_PAYLOAD)` and `encodeURIComponent`.
 */
export const CLI_0X_LINK_DATA: string =
    'details%7CrepoOwner%7Cbundlewatch%7CrepoName%7CrepoCurrentBranch%7Cfeat%2F%22quotes%22%26%3Cb%3E%7CrepoBranchBase%7Cmaster%7CcommitSha%7C3b63e5c0a5d1f0e6c9f1b0e2d6a7c8b9e0f1a2b3%7Cresults%7Cstatus%7Cfail%7Csummary%7CmaxSize%2Bcheck%2Bfailed%7CfullResults%7CfilePath%7C.%2Fdist%2Fmain.js%7Cpass%7Csize%7CbaseBranchSize%7CmaxSize%7C.%2Fdist%2F%3Cscript%3Ealert(1)%3C%2Fscript%3E.js%7C.%2Fdist%2Fvendor.js%7C.%2Fdist%2Fold.js%7Cremoved%7C.%2Fdist%2F*.map%7Cerror%7CThere%2Bis%2Bno%2Bmatching%2Bfile%2Bfor%2B.%2Fdist%2F*.map%5EO9K%7CN5C%7C270G%7CRS%7C0%7C4E0W%7C4I1C%7C270G%7C0%7CQ2%7C0%5EInfinity%5E%240%7C%241%7C2%7C3%7C2%7C4%7C5%7C6%7C7%7C8%7C9%5D%7CA%7C%24B%7CC%7CD%7CE%7CF%7C%40%24G%7CH%7CB%7CI%7CJ%7CT%7CK%7CU%7CL%7CV%5D%7C%24G%7CM%7CB%7CI%7CJ%7CW%7CK%7CX%7CL%7C14%5D%7C%24G%7CN%7CB%7CC%7CJ%7CY%7CK%7CZ%7CL%7C10%5D%7C%24G%7CO%7CB%7CP%7CJ%7C11%7CK%7C12%7CL%7C13%5D%7C%24G%7CQ%7CR%7CS%7CB%7CC%5D%5D%5D%5D'

export const CLI_0X_PAYLOAD: ResultsData = {
    details: {
        repoOwner: 'bundlewatch',
        repoName: 'bundlewatch',
        repoCurrentBranch: 'feat/"quotes"&<b>',
        repoBranchBase: 'master',
        commitSha: '3b63e5c0a5d1f0e6c9f1b0e2d6a7c8b9e0f1a2b3',
    },
    results: {
        status: 'fail',
        summary: 'maxSize check failed',
        fullResults: [
            {
                filePath: './dist/main.js',
                status: 'pass',
                size: 31448,
                baseBranchSize: 30000,
                maxSize: 102400,
            },
            {
                filePath: './dist/<script>alert(1)</script>.js',
                status: 'pass',
                size: 1000,
                baseBranchSize: 0,
                maxSize: Number.POSITIVE_INFINITY,
            },
            {
                filePath: './dist/vendor.js',
                status: 'fail',
                size: 204800,
                baseBranchSize: 210000,
                maxSize: 102400,
            },
            {
                filePath: './dist/old.js',
                status: 'removed',
                size: 0,
                baseBranchSize: 938,
                maxSize: 0,
            },
            {
                filePath: './dist/*.map',
                error: 'There is no matching file for ./dist/*.map',
                status: 'fail',
            },
        ],
    },
}

/**
 * Links captured from 0.x end-to-end runs (TEST_CASES.md in
 * bundlewatch/service). `littleDifference` predates message stripping;
 * `bareBones` has unencoded `$` and `/` and undefined details.
 */
export const CAPTURED_LINK_DATA: {
    littleDifference: string
    bareBones: string
} = {
    littleDifference:
        'details%7CrepoOwner%7Cbundlewatch%7CrepoName%7Ce2e-test%7CrepoCurrentBranch%7Cjakebolam-patch-1%7CrepoBranchBase%7Cmaster%7CcommitSha%7C6e2fa2aff3ce9d2a09642c201dabef565527c84c%7Cresults%7Cstatus%7Cpass%7CfullResults%7CfilePath%7C.%2F__testdata__%2Ftest-file-1.jpg%7Cmessage%7C30.71KB%2B%3C%2B500KB%2B(no%2Bdifference)%2B(gzip)%7Csize%7CbaseBranchSize%7CmaxSize%7C.%2F__testdata__%2Ftest-file-2.jpg%7C198.6KB%2B%3C%2B500KB%2B(no%2Bdifference)%2B(gzip)%7C.%2FREADME.md%7C131B%2B%3C%2B5KB%2B(15B%2Bsmaller%2Bthan%2Bmaster)%2B(gzip)%7Csummary%7CPASS%2B%3A%3A%2BEverything%2Bis%2Bin%2Bcheck%2B(%252B0B%2C%2B-15B)%5EO9K%7CO9K%7CAZ28%7C4CX4%7C4CX4%7CAZ28%7C3N%7C42%7C3Y8%5E%5E%240%7C%241%7C2%7C3%7C4%7C5%7C6%7C7%7C8%7C9%7CA%5D%7CB%7C%24C%7CD%7CE%7C%40%24F%7CG%7CH%7CI%7CC%7CD%7CJ%7CS%7CK%7CT%7CL%7CU%5D%7C%24F%7CM%7CH%7CN%7CC%7CD%7CJ%7CV%7CK%7CW%7CL%7CX%5D%7C%24F%7CO%7CH%7CP%7CC%7CD%7CJ%7CY%7CK%7CZ%7CL%7C10%5D%5D%7CQ%7CR%5D%5D',
    bareBones:
        'details%7CrepoOwner%7CrepoName%7CrepoCurrentBranch%7CrepoBranchBase%7Cmaster%7CcommitSha%7Cresults%7Cstatus%7Cfail%7CfullResults%7CfilePath%7C./__testdata__/test-file-1.jpg%7Cpass%7Csize%7CbaseBranchSize%7CmaxSize%7C./__testdata__/test-file-2.jpg%7Csummary%7CmaxSize%2Bcheck%2Bfailed%5EO9K%7C0%7C270G%7C4CX4%7C0%7C270G%5E%5E$0%7C$1%7C-5%7C2%7C-5%7C3%7C-5%7C4%7C5%7C6%7C-5%5D%7C7%7C$8%7C9%7CA%7C@$B%7CC%7C8%7CD%7CE%7CK%7CF%7CL%7CG%7CM%5D%7C$B%7CH%7C8%7C9%7CE%7CN%7CF%7CO%7CG%7CP%5D%5D%7CI%7CJ%5D%5D',
}
