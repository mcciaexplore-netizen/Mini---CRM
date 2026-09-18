import {RequestError} from './access.mjs'
export function detectLogoType(buffer) {
    if(!buffer.length||buffer.length>524288)throw new RequestError('Choose an image no larger than 512 KB.')
    if(buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return 'image/png'
    if(buffer[0]===255&&buffer[1]===216&&buffer[2]===255)return 'image/jpeg'
    if(buffer.subarray(0,4).toString()==='RIFF'&&buffer.subarray(8,12).toString()==='WEBP')return 'image/webp'
    throw new RequestError('Choose a PNG, JPEG or WebP image.')
}
