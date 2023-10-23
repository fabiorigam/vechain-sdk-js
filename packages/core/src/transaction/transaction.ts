import { address } from '../address';
import { type RLPValidObject } from '../encoding';
import { blake2b256 } from '../hash';
import { secp256k1 } from '../secp256k1';
import {
    BLOCKREF_LENGTH,
    ERRORS,
    SIGNATURE_LENGTH,
    SIGNED_TRANSACTION_RLP,
    TRANSACTION_FEATURES_KIND,
    UNSIGNED_TRANSACTION_RLP,
    dataUtils
} from '../utils';
import { TransactionUtils } from '../utils/transaction';
import { type TransactionBody } from './types';

/**
 * Represents an immutable transaction entity.
 *
 * @remarks
 * Properties should be treated as read-only to avoid unintended side effects.
 * Any modifications create a new transaction instance which should be handled by the TransactionHandler component.
 *
 * @see {@link TransactionHandler} for transaction manipulation details.
 */
class Transaction {
    /**
     * Transaction body. It represents the body of the transaction.
     *
     * @note It is better to take it as a read-only property in order to avoid any external modification.
     */
    public readonly body: TransactionBody;

    /**
     * Transaction signature. It represents the signature of the transaction.
     *
     * @note It is better to take it as a read-only property in order to avoid any external modification.
     */
    public readonly signature?: Buffer;

    /**
     * Constructor with parameters.
     * This constructor creates a transaction immutable object.
     *
     * @param body - Transaction body
     * @param signature - Optional signature for the transaction
     */
    constructor(body: TransactionBody, signature?: Buffer) {
        // Body
        if (this._isValidBody(body)) this.body = body;
        else throw new Error(ERRORS.TRANSACTION.INVALID_TRANSACTION_BODY);

        // User passed a signature
        if (signature !== undefined) {
            if (this._isSignatureValid(signature)) this.signature = signature;
            else throw new Error(ERRORS.TRANSACTION.INVALID_SIGNATURE);
        }
    }

    // ********** PUBLIC GET ONLY FUNCTIONS **********

    /**
     * Calculate intrinsic gas required for this transaction
     *
     * @returns Intrinsic gas required for this transaction
     */
    public get intrinsicGas(): number {
        return TransactionUtils.intrinsicGas(this.body.clauses);
    }

    /**
     * Determines whether the transaction is delegated.
     *
     * @returns If transaction is delegated or not
     */
    public get isDelegated(): boolean {
        return this._isDelegated(this.body);
    }

    /**
     * Get transaction delegator address from signature.
     *
     * @returns Transaction delegator address
     */
    public get delegator(): string {
        // Undelegated transaction
        if (!this.isDelegated)
            throw new Error(ERRORS.TRANSACTION.NOT_DELEGATED);

        // Unsigned transaction (@note we don't check if signature is valid or not, because we have checked it into constructor at creation time)
        if (!this.isSigned) throw new Error(ERRORS.TRANSACTION.NOT_SIGNED);

        // Slice signature needed to recover public key
        // Obtains the recovery param from the signature
        const signatureSliced = (this.signature as Buffer).subarray(
            65,
            this.signature?.length
        );

        // Recover public key
        const delegatorPublicKey = secp256k1.recover(
            this.getSignatureHash(this.origin),
            signatureSliced
        );

        // Address from public key
        return address.fromPublicKey(delegatorPublicKey);
    }

    /**
     * Determines whether the transaction is signed or not.
     *
     * @param transaction - Transaction to check
     * @returns If transaction is signed or not
     */
    public get isSigned(): boolean {
        return this.signature !== undefined;
    }

    /**
     * Computes the signature hash for the transaction. The output is based on
     * the presence of the 'delegateFor' parameter.
     *
     * @param delegateFor - Optional address of the delegator.
     * @returns The computed hash.
     *
     * Mainly:
     *  - No 'delegateFor': return txHash
     * - 'delegateFor' return txHash +  hash('delegateFor' address)
     *
     * @remarks
     * delegateFor is used to sign a transaction on behalf of another account.
     * In fact when the delegator sign the transaction, delegator will add the address
     * of who send the transaction to sign (in this case the 'delegateFor' address parameter)
     *
     * @example
     * A is transaction origin
     * B is the delegator
     * TX is the transaction
     *
     * A send a TX (signed by A) to B to who add his signature to TX using delegateFor parameter (that is A address)
     * on signing hash of TX computation.
     *
     * Mathematically:
     *
     * ```
     * final_signature = concat_buffer(
     *      sign(TX.signingHash(), A.privateKey),
     *      sign(TX.signingHash(A.address), B.privateKey)
     * )
     * ```
     *
     * Where:
     *
     * ```
     * TX.signatureHash() = blake2b256(TX.encoded)
     * TX.signingHash(A.address) = blake2b256(
     *      concat(
     *              blake2b256(TX.encoded),
     *              A.address
     * )
     * ```
     *
     * @param transaction - Transaction of which we want to compute the signing hash
     * @param delegateFor - Address of the delegator
     * @returns Signing hash of the transaction
     */
    public getSignatureHash(delegateFor?: string): Buffer {
        // Correct delegateFor address
        if (delegateFor !== undefined && !address.isAddress(delegateFor))
            throw new Error(ERRORS.ADDRESS.INVALID_ADDRESS);

        // Encode transaction
        const transactionHash = blake2b256(this._encode(false));

        // There is a delegateFor address (@note we already know that it is a valid address)
        if (delegateFor !== undefined) {
            const hash = blake2b256(
                Buffer.concat([
                    transactionHash,
                    Buffer.from(delegateFor.slice(2), 'hex')
                ])
            );
            return hash;
        }

        return transactionHash;
    }

    /**
     * Encode a transaction
     *
     * @returns The transaction encoded
     */
    public get encoded(): Buffer {
        return this._encode(this.isSigned);
    }

    /**
     * Get transaction origin address from signature.
     *
     * @returns Transaction origin
     */
    public get origin(): string {
        // Unsigned transaction (@note we don't check if signature is valid or not, because we have checked it into constructor at creation time)
        if (!this.isSigned) throw new Error(ERRORS.TRANSACTION.NOT_SIGNED);

        // Slice signature
        // Obtains the concatenated signature (r, s) of ECDSA digital signature
        const signatureSliced = (this.signature as Buffer).subarray(0, 65);

        // Recover public key
        const originPublicKey = secp256k1.recover(
            this.getSignatureHash(),
            signatureSliced
        );

        // Address from public key
        return address.fromPublicKey(originPublicKey);
    }

    /**
     * Get transaction ID from signature.
     *
     * @returns Transaction ID
     */
    get id(): string {
        // Unsigned transaction (@note we don't check if signature is valid or not, because we have checked it into constructor at creation time)
        if (!this.isSigned) throw new Error(ERRORS.TRANSACTION.NOT_SIGNED);

        // Return transaction ID
        return blake2b256(
            Buffer.concat([
                this.getSignatureHash(),
                Buffer.from(this.origin.slice(2), 'hex')
            ]),
            'hex'
        );
    }

    // ********** INTERNAL PRIVATE FUNCTIONS **********

    /**
     * Internal function to check if transaction is delegated or not.
     * This function is used to check directly the transaction body.
     * @private
     *
     * @param body Transaction body to check
     * @returns Weather the transaction is delegated or not
     */
    private _isDelegated(body: TransactionBody): boolean {
        // Check if is reserved or not
        const reserved = body.reserved ?? {};

        // Features
        const features = reserved.features ?? 0;

        // Fashion bitwise way to check if a number is even or not
        return (features & 1) === 1;
    }

    /**
     * Internal function to check if signature is valid or not.
     * This function is used to check directly the signature.
     * @private
     *
     * @param signature Signature to check
     * @returns Weather the signature is valid or not
     */
    private _isSignatureValid(signature: Buffer): boolean {
        // Verify signature length
        const expectedSigatureLength = this._isDelegated(this.body)
            ? SIGNATURE_LENGTH * 2
            : SIGNATURE_LENGTH;

        return signature.length === expectedSigatureLength;
    }

    /**
     * Encodes the reserved field to ensure it exists in every encoding.
     *
     * Due to the fact that reserved field is optional in TransactionBody,
     * BUT mandatory in RLPProfiler, we need to have it in every encoding.
     * Fot this reason this function is needed.
     * @private
     *
     * @returns Encoding of reserved field
     */
    private _encodeReservedField(): Buffer[] {
        // Check if is reserved or not
        const reserved = this.body.reserved ?? {};

        // Init kind for features
        const featuresKind = TRANSACTION_FEATURES_KIND.kind;

        // Features list
        const featuresList = [
            featuresKind
                .data(reserved.features ?? 0, TRANSACTION_FEATURES_KIND.name)
                .encode(),
            ...(reserved.unused ?? [])
        ];

        // Trim features list
        while (featuresList.length > 0) {
            if (featuresList[featuresList.length - 1].length === 0) {
                featuresList.pop();
            } else {
                break;
            }
        }
        return featuresList;
    }

    /**
     * Make the RLP encoding of a transaction body.
     * @private
     *
     * @param body Body to encode
     * @param isSigned If transaction is signed or not
     * @returns RLP encoding of transaction body
     */
    private _lowLevelEncodeTransactionBodyWithRLP(
        body: RLPValidObject,
        isSigned: boolean
    ): Buffer {
        // Encode transaction object - SIGNED
        if (isSigned) {
            return SIGNED_TRANSACTION_RLP.encodeObject({
                ...body,
                signature: this.signature
            });
        }

        // Encode transaction object - UNSIGNED
        return UNSIGNED_TRANSACTION_RLP.encodeObject(body);
    }

    /**
     * Private utility function to encode a transaction.
     * @private
     *
     * @param isSigned If transaction is signed or not (needed to determine if encoding with SIGNED_TRANSACTION_RLP or UNSIGNED_TRANSACTION_RLP)
     * @returns Encoding of transaction
     */
    private _encode(isSigned: boolean): Buffer {
        // Encode transaction body with RLP
        return this._lowLevelEncodeTransactionBodyWithRLP(
            {
                // Existing body (clauses, gasPrice, gasLimit, nonce, chainTag, blockRef, expiration, ... AND OPTIONALLY reserved field)
                ...this.body,

                /*
                 * @note: this.body.clauses is already an array.
                 * But TypeScript doesn't know that and for this reason we need to cast it.
                 * Otherwise encodeObject will throw an error.
                 */
                clauses: this.body.clauses as Array<{
                    to: string | null;
                    value: string | number;
                    data: string;
                }>,

                // New reserved field
                reserved: this._encodeReservedField()
            },
            isSigned
        );
    }

    /**
     * Private utility function to check transaction body
     * @private
     *
     * @param body Transaction body to check
     */
    private _isValidBody(body: TransactionBody): boolean {
        // Check if body is valid
        return (
            // Chain tag
            body.chainTag !== undefined &&
            body.chainTag >= 0 &&
            body.chainTag <= 255 &&
            // Block reference
            body.blockRef !== undefined &&
            dataUtils.isHexString(body.blockRef) &&
            Buffer.from(body.blockRef.slice(2), 'hex').length ===
                BLOCKREF_LENGTH &&
            // Expiration
            body.expiration !== undefined &&
            // Clauses
            body.clauses !== undefined &&
            // Gas price coef
            body.gasPriceCoef !== undefined &&
            // Gas
            body.gas !== undefined &&
            // Depends on
            body.dependsOn !== undefined &&
            // Nonce
            body.nonce !== undefined
        );
    }
}

export { Transaction };
