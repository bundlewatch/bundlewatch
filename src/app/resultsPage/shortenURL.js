import axios from 'axios'
import logger from '../../logger'

const API_KEY = 'AIzaSyBhfxTjDFr98q7w7Us9x0Uxk34PgdkW2WI'
const DOMAIN_BASE = 'ja2r7.app.goo.gl'

const shortenURL = url => {
    return axios
        .post(
            `https://firebasedynamiclinks.googleapis.com/v1/shortLinks?key=${API_KEY}`,
            {
                dynamicLinkInfo: {
                    dynamicLinkDomain: DOMAIN_BASE,
                    link: url,
                },
            },
            {
                timeout: 5000,
            },
        )
        .then(response => {
            if (response.data && response.data.shortLink) {
                return response.data.shortLink
            }
            logger.error('Unable to shorten URL, no URL found in response')
            logger.debug(response.data)
            return url
        })
        .catch(error => {
            logger.debug(error)
            logger.error(
                `Unable to shorten URL code=${error.code || error.message}`,
            )
            return url
        })
}

export default shortenURL
