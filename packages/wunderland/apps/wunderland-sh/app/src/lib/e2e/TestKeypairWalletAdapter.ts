'use client';

import nacl from 'tweetnacl';
import { Keypair, PublicKey, Transaction } from '@solana/web3.js';
import {
  BaseMessageSignerWalletAdapter,
  WalletConnectionError,
  WalletDisconnectionError,
  WalletName,
  WalletNotConnectedError,
  WalletReadyState,
  WalletSignMessageError,
  WalletSignTransactionError,
  type TransactionOrVersionedTransaction,
} from '@solana/wallet-adapter-base';

export const TestKeypairWalletName = 'E2E Test Wallet' as WalletName<'E2E Test Wallet'>;

function parseSecretKeyJson(secretKeyJson: string): Uint8Array {
  let parsed: unknown;
  try {
    parsed = JSON.parse(secretKeyJson) as unknown;
  } catch {
    throw new Error('Invalid E2E secret key JSON (expected a JSON array of numbers).');
  }
  if (!Array.isArray(parsed) || parsed.length !== 64) {
    throw new Error('Invalid E2E secret key (expected 64-byte secret key array).');
  }
  const nums = parsed as unknown[];
  return Uint8Array.from(nums.map((n) => (Number(n) || 0) & 0xff));
}

const ICON_SVG = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" rx="12" fill="#0b0f19"/><path d="M18 34h28v6H18z" fill="#00f5ff"/><path d="M18 22h28v6H18z" fill="#10ffb0"/></svg>`,
)}`;

export class TestKeypairWalletAdapter extends BaseMessageSignerWalletAdapter {
  readonly name = TestKeypairWalletName;
  readonly url = 'https://wunderland.sh';
  readonly icon = ICON_SVG;
  readonly supportedTransactionVersions = new Set(['legacy', 0] as const);

  private keypair: Keypair | null = null;
  private keypairPublicKey: PublicKey | null = null;
  private isConnecting = false;
  private readonly secretKeyJson: string;

  constructor(secretKeyJson: string) {
    super();
    this.secretKeyJson = secretKeyJson;
  }

  get readyState() {
    return WalletReadyState.Installed;
  }

  get publicKey() {
    return this.keypairPublicKey;
  }

  get connecting() {
    return this.isConnecting;
  }

  async connect(): Promise<void> {
    try {
      if (this.connected) return;
      if (this.isConnecting) return;
      this.isConnecting = true;

      const secretKey = parseSecretKeyJson(this.secretKeyJson);
      this.keypair = Keypair.fromSecretKey(secretKey);
      this.keypairPublicKey = this.keypair.publicKey;
      this.emit('connect', this.keypairPublicKey);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const wrapped = new WalletConnectionError(message, err);
      this.emit('error', wrapped);
      throw wrapped;
    } finally {
      this.isConnecting = false;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (!this.connected) return;
      this.keypair = null;
      this.keypairPublicKey = null;
      this.emit('disconnect');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const wrapped = new WalletDisconnectionError(message, err);
      this.emit('error', wrapped);
      throw wrapped;
    }
  }

  async signTransaction<T extends TransactionOrVersionedTransaction<this['supportedTransactionVersions']>>(
    transaction: T,
  ): Promise<T> {
    try {
      if (!this.keypair) throw new WalletNotConnectedError();
      if (transaction instanceof Transaction) {
        transaction.partialSign(this.keypair);
      } else {
        transaction.sign([this.keypair]);
      }
      return transaction;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const wrapped = new WalletSignTransactionError(message, err);
      this.emit('error', wrapped);
      throw wrapped;
    }
  }

  async signAllTransactions<T extends TransactionOrVersionedTransaction<this['supportedTransactionVersions']>>(
    transactions: T[],
  ): Promise<T[]> {
    const signed: T[] = [];
    for (const tx of transactions) signed.push(await this.signTransaction(tx));
    return signed;
  }

  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    try {
      if (!this.keypair) throw new WalletNotConnectedError();
      return nacl.sign.detached(message, this.keypair.secretKey);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const wrapped = new WalletSignMessageError(message, err);
      this.emit('error', wrapped);
      throw wrapped;
    }
  }
}
