import { beforeEach, describe, expect, test } from '@jest/globals';
import { FunctionNotImplemented } from '@vechain/sdk-errors';
import {
    RPC_METHODS,
    RPCMethodsMap,
    TESTNET_URL,
    ThorClient
} from '../../../../../src';

/**
 * RPC Mapper integration tests for 'eth_createAccessList' method
 *
 * @group integration/rpc-mapper/methods/eth_createAccessList
 */
describe('RPC Mapper - eth_createAccessList method tests', () => {
    /**
     * Thor client instance
     */
    let thorClient: ThorClient;

    /**
     * Init thor client before each test
     */
    beforeEach(() => {
        // Init thor client
        thorClient = ThorClient.fromUrl(TESTNET_URL);
    });

    /**
     * eth_createAccessList RPC call tests - Positive cases
     */
    describe('eth_createAccessList - Positive cases', () => {
        /**
         * Positive case 1 - ... Description ...
         */
        test('eth_createAccessList - positive case 1', async () => {
            // NOT IMPLEMENTED YET!
            await expect(
                async () =>
                    await RPCMethodsMap(thorClient)[
                        RPC_METHODS.eth_createAccessList
                    ]([-1])
            ).rejects.toThrowError(FunctionNotImplemented);
        });
    });

    /**
     * eth_createAccessList RPC call tests - Negative cases
     */
    describe('eth_createAccessList - Negative cases', () => {
        /**
         * Negative case 1 - ... Description ...
         */
        test('eth_createAccessList - negative case 1', async () => {
            // NOT IMPLEMENTED YET!
            await expect(
                async () =>
                    await RPCMethodsMap(thorClient)[
                        RPC_METHODS.eth_createAccessList
                    ](['SOME_RANDOM_PARAM'])
            ).rejects.toThrowError(FunctionNotImplemented);
        });
    });
});
