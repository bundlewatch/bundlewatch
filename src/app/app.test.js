import bundlewatchApi from './index'

describe('bundlewatchApi', () => {
    it('Runs without error', () => {
        expect(async () => {
            await bundlewatchApi({
                files: [
                    {
                        path: './__testdata__/*.jpg',
                        maxSize: '100kB',
                    },
                ],
                defaultCompression: 'none',
                bundlewatchServiceHost: 'http://localhost:3000',
            })
        }).not.toThrow()
    })
})
