import { describe, expect, test } from '@jest/globals';
import { type HttpParams } from '../../src';
import { testnetGenesisBlock, network, testAccount } from './fixture';

/**
 * Timeout for each test.
 * Overrides the default timeout of 5 seconds due to cases where the network request takes longer than 5 seconds.
 */
const TIMEOUT = 10000;

/**
 * SimpleNet class tests
 * @group integration/network
 */
describe('Test SimpleNet class on Testnet', () => {
    /**
     * HTTP Request tests
     */
    test(
        'Should perform an HTTP GET request and resolve with response data',
        async () => {
            // Perform an HTTP GET request using the SimpleNet instance
            const response = await network.http(
                'GET',
                '/blocks/0?expanded=false'
            );

            // Assert that the response matches the expected firstTestnetBlock
            expect(JSON.stringify(response)).toEqual(
                JSON.stringify(testnetGenesisBlock)
            );
        },
        TIMEOUT
    );

    /**
     * HTTP Request tests rejecting with an error
     */
    test(
        'Should reject with an error if the HTTP request fails',
        async () => {
            // Assert that the HTTP request fails with an error
            await expect(
                network.http('GET', '/error-test-path')
            ).rejects.toThrowError(
                '404 get /error-test-path: 404 page not found'
            );
        },
        TIMEOUT
    );

    /**
     * Request params validation
     */
    test(
        'Should validate response headers',
        async () => {
            const customParams: HttpParams = {
                query: {},
                body: {},
                headers: {
                    'X-Custom-Header': 'custom-value'
                },
                validateResponseHeader: function (
                    headers: Record<string, string>
                ): void {
                    expect(headers).toBeDefined();
                }
            };

            // Make an actual HTTP GET request and pass the validateResponseHeaders function
            const response = await network.http(
                'GET',
                '/accounts/' + testAccount,
                customParams
            );

            // You can also check the response data if needed
            expect(response).toBeDefined();
        },
        TIMEOUT
    );

    /**
     * Request params validation rejecting with an error
     */
    test('Should throw error for invalid header response', async () => {
        const customParams: HttpParams = {
            query: {},
            body: {},
            headers: {
                'X-Custom-Header': 'custom-value'
            },
            validateResponseHeader: function (): void {
                throw new Error(`Forcing error on header validation`);
            }
        };

        await expect(
            network.http('GET', '/accounts/' + testAccount, customParams)
        ).rejects.toThrowError(`Forcing error on header validation`);
    });
});
