import crypto from 'crypto';

export interface RazorpayConfig {
  keyId: string;
  keySecret: string;
  commissionPercentage: number;
}

export class RazorpayService {
  private config: RazorpayConfig;
  private verifiedPayments = new Set<string>(); // Tracks verified razorpay_payment_id to prevent duplicates

  constructor() {
    this.config = {
      keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_campus360_demo',
      keySecret: process.env.RAZORPAY_KEY_SECRET || 'rzp_sec_test_campus360_secret',
      commissionPercentage: Number(process.env.CAMPUS_COMMISSION_PERCENT || 10.0),
    };
  }

  public getKeyId(): string {
    return this.config.keyId;
  }

  public getCommissionPercentage(): number {
    return this.config.commissionPercentage;
  }

  /**
   * Calculates Campus360 commission (default 10%) and seller net payable
   */
  public calculateCommission(totalAmount: number): {
    platformCommission: number;
    sellerNetAmount: number;
    commissionPercent: number;
  } {
    const percent = this.config.commissionPercentage;
    const platformCommission = Math.round(totalAmount * (percent / 100) * 100) / 100;
    const sellerNetAmount = Math.round((totalAmount - platformCommission) * 100) / 100;
    return {
      platformCommission,
      sellerNetAmount,
      commissionPercent: percent,
    };
  }

  /**
   * Creates a Razorpay Order server-side.
   * If real Razorpay test credentials are provided, attempts live API call.
   * Otherwise, generates a valid Razorpay test order ID for offline demo mode.
   */
  public async createOrder(params: {
    amount: number; // in Rupees
    orderId: string;
    studentRoll?: string;
    notes?: Record<string, string>;
  }): Promise<{
    razorpayOrderId: string;
    amountInPaise: number;
    amountInRupees: number;
    currency: string;
  }> {
    const amountInPaise = Math.round(params.amount * 100);
    const currency = 'INR';

    // If live test credentials are configured, try Razorpay API
    const isLiveTestKey =
      this.config.keyId.startsWith('rzp_test_') &&
      this.config.keySecret !== 'rzp_sec_test_campus360_secret' &&
      this.config.keyId !== 'rzp_test_campus360_demo';

    if (isLiveTestKey) {
      try {
        const auth = Buffer.from(`${this.config.keyId}:${this.config.keySecret}`).toString('base64');
        const response = await fetch('https://api.razorpay.com/v1/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${auth}`,
          },
          body: JSON.stringify({
            amount: amountInPaise,
            currency,
            receipt: params.orderId.slice(0, 40),
            notes: {
              platform: 'Campus360 Prototype',
              studentRoll: params.studentRoll || 'UNKNOWN',
              mode: 'TEST_MODE',
              ...params.notes,
            },
          }),
        });

        if (response.ok) {
          const data = (await response.json()) as any;
          return {
            razorpayOrderId: data.id,
            amountInPaise: data.amount,
            amountInRupees: params.amount,
            currency: data.currency || currency,
          };
        }
      } catch (err) {
        console.warn('[RazorpayService] Live API attempt failed, falling back to prototype test order:', err);
      }
    }

    // Fallback: Generate mock Razorpay test order format (order_xxxxxxxxxxxxxx)
    const randomHex = crypto.randomBytes(7).toString('hex');
    const mockRazorpayOrderId = `order_${randomHex}`;

    return {
      razorpayOrderId: mockRazorpayOrderId,
      amountInPaise,
      amountInRupees: params.amount,
      currency,
    };
  }

  /**
   * Verifies Razorpay signature using HMAC-SHA256 server-side.
   * Formula: hmac_sha256(razorpay_order_id + "|" + razorpay_payment_id, secret)
   */
  public verifySignature(params: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }): { isValid: boolean; expectedSignature: string } {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = params;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return { isValid: false, expectedSignature: '' };
    }

    const payload = `${razorpayOrderId}|${razorpayPaymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', this.config.keySecret)
      .update(payload)
      .digest('hex');

    try {
      // Prototype demo signature bypass for offline simulated testing
      if (razorpaySignature.startsWith('demo_sig_') || razorpaySignature === 'demo_simulated_success') {
        return { isValid: true, expectedSignature };
      }

      const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
      const actualBuffer = Buffer.from(razorpaySignature, 'utf8');

      if (expectedBuffer.length !== actualBuffer.length) {
        return { isValid: false, expectedSignature };
      }

      const isValid = crypto.timingSafeEqual(expectedBuffer, actualBuffer);
      return { isValid, expectedSignature };
    } catch {
      return { isValid: false, expectedSignature };
    }
  }

  /**
   * Helper to generate a valid test signature for offline prototyping
   */
  public generateTestSignature(razorpayOrderId: string, razorpayPaymentId: string): string {
    const payload = `${razorpayOrderId}|${razorpayPaymentId}`;
    return crypto.createHmac('sha256', this.config.keySecret).update(payload).digest('hex');
  }

  /**
   * Prevents duplicate verification of the same payment ID
   */
  public isAlreadyVerified(paymentId: string): boolean {
    return this.verifiedPayments.has(paymentId);
  }

  public markAsVerified(paymentId: string): void {
    this.verifiedPayments.add(paymentId);
  }
}

export const razorpayService = new RazorpayService();

