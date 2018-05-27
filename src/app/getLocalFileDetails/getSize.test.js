import getSize from './getSize'
import ValidationError from '../errors/ValidationError'

describe('getSize', () => {
    it('Throws validations error when using brotli compression without the package', async () => {
        expect(() =>
            getSize({
                filePath: './__testdata__/test-file-1.jpg',
                compression: 'brotli',
            }),
        ).toThrow(ValidationError)
    })
})
