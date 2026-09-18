import { RequestError } from './access.mjs'

// Bound streamed uploads too: Content-Length is optional and untrusted.
export async function readLimitedBody(request, limit) {
    if (Number(request.headers.get('content-length')) > limit) {
        throw new RequestError('Upload is too large.', 413)
    }
    if (!request.body) throw new RequestError('No file supplied.')
    const reader = request.body.getReader()
    let size = 0
    const chunks = []
    try {
        while (true) {
            const { value, done } = await reader.read()
            if (done) break
            size += value.length
            if (size > limit) {
                await reader.cancel()
                throw new RequestError('Upload is too large.', 413)
            }
            chunks.push(value)
        }
    } finally {
        reader.releaseLock()
    }
    return Buffer.concat(chunks)
}
