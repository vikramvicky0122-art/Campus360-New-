import crypto from 'crypto';

export interface YouPiConfig {
  merchantId: string;
  secretKey: string;
  apiUrl: string;
  vpaAddress: string;
  merchantName: string;
}

export class YouPiGatewayService {
  private config: YouPiConfig;
  private idempotencyStore = new Map<string, { timestamp: number; response: unknown }>();

  constructor() {
    this.config = {
      merchantId: process.env.YOUPI_PG_MERCHANT_ID || 'campus_bazaar_sandbox_mid',
      secretKey: process.env.YOUPI_PG_SECRET_KEY || 'ypk_sec_sand_9483018237cb',
      apiUrl: process.env.YOUPI_PG_API_URL || 'https://sandbox.youpi-pg.io/v1',
      vpaAddress: 'Campus360@youpi',
      merchantName: 'Campus360 PG',
    };
  }

  /**
   * Generates HMAC-SHA256 signature for request/response authentication
   */
  public generateSignature(payloadString: string): string {
    return crypto
      .createHmac('sha256', this.config.secretKey)
      .update(payloadString)
      .digest('hex');
  }

  /**
   * Verifies incoming webhook or payment verification signature
   */
  public verifySignature(payloadString: string, signature: string): boolean {
    if (!signature) return false;
    const expected = this.generateSignature(payloadString);
    try {
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
    } catch {
      return false;
    }
  }

  /**
   * Checks for duplicate requests via idempotency key
   */
  public checkIdempotency(key?: string): unknown | null {
    if (!key) return null;
    const existing = this.idempotencyStore.get(key);
    if (existing && Date.now() - existing.timestamp < 3600000) {
      return existing.response;
    }
    return null;
  }

  public recordIdempotency(key: string, response: unknown): void {
    this.idempotencyStore.set(key, { timestamp: Date.now(), response });
  }

  /**
   * Creates a YouPI-PG Payment Order with standard UPI Intent link and QR Code data
   */
  public createOrder(params: {
    orderId: string;
    amount: number;
    currency?: string;
    studentRoll: string;
    productTitle: string;
    idempotencyKey?: string;
  }) {
    const { orderId, amount, currency = 'INR', studentRoll, productTitle, idempotencyKey } = params;

    if (idempotencyKey) {
      const cached = this.checkIdempotency(idempotencyKey);
      if (cached) return cached;
    }

    const gatewayOrderId = `YPI_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const formattedAmount = amount.toFixed(2);

    // Standard NPCI UPI Intent specifications: upi://pay?pa=...&pn=...&am=...&tr=...
    const sanitizedTitle = encodeURIComponent(productTitle.slice(0, 25));
    const upiIntentUrl = `upi://pay?pa=${encodeURIComponent(this.config.vpaAddress)}&pn=${encodeURIComponent(
      this.config.merchantName
    )}&mc=5411&tid=${gatewayOrderId}&tr=${orderId}&am=${formattedAmount}&cu=${currency}&tn=${sanitizedTitle}`;

    // Payload string for HMAC signature
    const signaturePayload = `${this.config.merchantId}|${gatewayOrderId}|${orderId}|${formattedAmount}|${currency}`;
    const signature = this.generateSignature(signaturePayload);

    const result = {
      success: true,
      provider: 'YouPI-PG',
      merchantId: this.config.merchantId,
      merchantName: this.config.merchantName,
      vpaAddress: this.config.vpaAddress,
      gatewayOrderId,
      orderId,
      amount: Number(formattedAmount),
      currency,
      upiIntentUrl,
      qrPayload: upiIntentUrl,
      signature,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    };

    if (idempotencyKey) {
      this.recordIdempotency(idempotencyKey, result);
    }

    return result;
  }

  /**
   * Server-side payment verification
   */
  public verifyPayment(params: {
    gatewayOrderId: string;
    orderId: string;
    paymentReferenceId: string;
    amount: number;
    status: 'SUCCESS' | 'FAILED' | 'CANCELLED';
    signature: string;
  }) {
    const { gatewayOrderId, orderId, paymentReferenceId, amount, status, signature } = params;

    // Verify signature
    const payloadToVerify = `${this.config.merchantId}|${gatewayOrderId}|${orderId}|${amount.toFixed(2)}|${status}`;
    const isSignatureValid = this.verifySignature(payloadToVerify, signature);

    // For sandbox/development testing, also allow validation if signature matches our generation
    const fallbackValid = this.generateSignature(payloadToVerify) === signature;

    const isValid = isSignatureValid || fallbackValid;

    return {
      isValid,
      status: isValid ? status : 'FAILED',
      gatewayOrderId,
      paymentReferenceId: paymentReferenceId || `UPI_REF_${Date.now()}`,
      verifiedAt: new Date().toISOString(),
      bankAuthCode: `AUTH_${Math.floor(100000 + Math.random() * 900000)}`,
      payoutNote: 'Held in Campus360 Escrow. Disbursed upon student handover confirmation.',
    };
  }
}

export const youPiGateway = new YouPiGatewayService();
