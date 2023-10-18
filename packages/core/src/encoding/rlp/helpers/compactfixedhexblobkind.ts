import { createRlpError } from './profiles';

/**
 * Asserts that the provided buffer is of a specific length and does not contain leading zeros.
 *
 * @param buffer - The buffer to validate.
 * @param context - Descriptive context for error messages, usually representing the caller's identity.
 * @param bytes - The expected maximum number of bytes that the buffer can contain.
 * @throws Will throw an error with a message containing the context if the buffer length is greater than the specified bytes or if it has leading zero bytes.
 */
const assertCompactFixedHexBlobBuffer = (
    buffer: Buffer,
    context: string,
    bytes: number
): void => {
    if (buffer.length > bytes) {
        throw createRlpError(
            context,
            `expected buffer to be at most ${bytes} bytes`
        );
    }

    if (buffer.length !== 0 && buffer[0] === 0) {
        throw createRlpError(context, 'expected no leading zero bytes');
    }
};

/**
 * Encodes a buffer by trimming leading zero bytes.
 * Finds the first non-zero byte and returns a new buffer starting from that byte. Returns an empty buffer if all bytes are zero.
 *
 * @param buffer - The buffer to be Compact.
 * @returns A Buffer instance Compact of leading zero bytes, or an empty Buffer if all bytes are zero.
 */
const encodeCompactFixedHexBlob = (buffer: Buffer): Buffer => {
    const zeroIndex: number = buffer.findIndex((byte: number) => byte !== 0);

    return zeroIndex !== -1 ? buffer.subarray(zeroIndex) : Buffer.alloc(0);
};

/**
 * Decodes a buffer into a hexadecimal string, ensuring a specific total byte length by prepending zeros if necessary.
 * Calculates the number of missing bytes compared to the expected total and prepends the corresponding number of '0' characters to the hexadecimal string representation of the buffer.
 *
 * @param buffer - The buffer to decode.
 * @param bytes - The expected total number of bytes in the final hexadecimal string (including leading zeros).
 * @returns A hexadecimal string with the necessary leading '0' characters to ensure the specified total byte length.
 */
const decodeBufferToHexWithLeadingZeros = (
    buffer: Buffer,
    bytes: number
): string => {
    const zeros = '0'.repeat((bytes - buffer.length) * 2);

    return `0x${zeros}${buffer.toString('hex')}`;
};

export {
    assertCompactFixedHexBlobBuffer,
    encodeCompactFixedHexBlob,
    decodeBufferToHexWithLeadingZeros
};
