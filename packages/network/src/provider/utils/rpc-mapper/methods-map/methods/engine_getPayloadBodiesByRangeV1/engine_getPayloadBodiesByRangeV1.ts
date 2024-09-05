import { VeChainSDKLogger } from '@vechain/sdk-logging';

/**
 * RPC Method engine_getPayloadBodiesByRangeV1 implementation
 *
 * @param thorClient - The thor client instance to use.
 * @param params - The standard array of rpc call parameters.
 * @note:
 * * params[0]: ...
 * * params[1]: ...
 * * params[n]: ...
 */
const engineGetPayloadBodiesByRangeV1 = async (): Promise<void> => {
    // To avoid eslint error
    await Promise.resolve(0);

    // Not implemented yet
    VeChainSDKLogger('warning').log({
        title: 'engine_getPayloadBodiesByRangeV1',
        messages: [
            'Method "engine_getPayloadBodiesByRangeV1" has not been implemented yet.'
        ]
    });
};

export { engineGetPayloadBodiesByRangeV1 };
