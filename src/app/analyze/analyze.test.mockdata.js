export const mockFileResults = {
    oneFileLarger: [
        {
            size: 125,
            baseBranchSize: 100,
        },
    ],
    oneFileSmaller: [
        {
            size: 200,
            baseBranchSize: 50,
        },
    ],
    oneFileLargerOneFileSmallerOverallSmaller: [
        {
            size: 125,
            baseBranchSize: 100,
        },
        {
            size: 650,
            baseBranchSize: 700,
        },
    ],
    oneFileLargerOneFileSmallerOverallLarger: [
        {
            size: 225,
            baseBranchSize: 100,
        },
        {
            size: 650,
            baseBranchSize: 700,
        },
    ],
}
