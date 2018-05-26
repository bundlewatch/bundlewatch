import { getOverallDifference } from '.'
import { mockFileResults } from './analyze.test.mockdata'

describe('getOverallDifference', () => {
    describe('Results match snapshot for the same input', () => {
        Object.keys(mockFileResults).forEach(mockFileResult => {
            it(mockFileResult, () => {
                expect(
                    getOverallDifference(
                        mockFileResults.oneFileLargerOneFileSmallerOverallSmaller,
                    ),
                ).toMatchSnapshot()
            })
        })
    })

    it('Returns bytes added when the file is larger than the base one', () => {
        const overallDifference = getOverallDifference(
            mockFileResults.oneFileLarger,
        )
        expect(overallDifference.totalAdded).toEqual(25)
        expect(overallDifference.totalRemoved).toEqual(0)
    })

    it('Returns bytes removed when the file is smaller than the base one', () => {
        const overallDifference = getOverallDifference(
            mockFileResults.oneFileSmaller,
        )
        expect(overallDifference.totalAdded).toEqual(150)
        expect(overallDifference.totalRemoved).toEqual(0)
    })

    it('Returns both bytes added and removed when some files are larger and some are smaller', () => {
        const overallDifference = getOverallDifference(
            mockFileResults.oneFileLargerOneFileSmallerOverallSmaller,
        )
        expect(overallDifference.totalAdded).toEqual(25)
        expect(overallDifference.totalRemoved).toEqual(50)
    })

    it('Returns a positive percentage change when the overall bundle size is larger', () => {
        const overallDifference = getOverallDifference(
            mockFileResults.oneFileLargerOneFileSmallerOverallLarger,
        )
        expect(overallDifference.percentageChange).toEqual(9.375)
    })

    it('Returns a negative percentage change when the overall bundle size is smaller', () => {
        const overallDifference = getOverallDifference(
            mockFileResults.oneFileLargerOneFileSmallerOverallSmaller,
        )
        expect(overallDifference.percentageChange).toEqual(-3.125)
    })
})
