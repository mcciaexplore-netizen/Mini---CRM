import { RequestError } from './access.mjs'

export function checkRequestOrigin(headers, baseURL) {
    const origin = headers.get('origin')
    if (origin && origin !== new URL(baseURL).origin) {
        throw new RequestError('Invalid request origin.', 403)
    }
}
