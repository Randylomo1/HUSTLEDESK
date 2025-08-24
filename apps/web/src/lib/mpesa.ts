import { env } from "./env";

interface MPesaConfig {
  consumerKey: string;
  consumerSecret: string;
  shortcode: string;
  passkey: string;
  environment: "sandbox" | "production";
}

interface STKPushRequest {
  phone: string;
  amount: number;
  accountReference: string;
  transactionDesc: string;
  callbackUrl: string;
}

interface STKPushResponse {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

class MPesaClient {
  private config: MPesaConfig;
  private baseUrl: string;
  private accessToken?: string;
  private tokenExpiry?: Date;

  constructor() {
    this.config = {
      consumerKey: env.MPESA_CONSUMER_KEY || "",
      consumerSecret: env.MPESA_CONSUMER_SECRET || "",
      shortcode: env.MPESA_SHORTCODE || "",
      passkey: env.MPESA_PASSKEY || "",
      environment: env.MPESA_ENV,
    };
    
    this.baseUrl = this.config.environment === "production" 
      ? "https://api.safaricom.co.ke" 
      : "https://sandbox.safaricom.co.ke";
  }

  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    const auth = Buffer.from(`${this.config.consumerKey}:${this.config.consumerSecret}`).toString('base64');
    
    const response = await fetch(`${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get M-Pesa access token: ${response.statusText}`);
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    
    // Token expires in 1 hour, cache for 55 minutes
    this.tokenExpiry = new Date(Date.now() + 55 * 60 * 1000);
    
    return this.accessToken;
  }

  private generateTimestamp(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    const second = String(now.getSeconds()).padStart(2, '0');
    
    return `${year}${month}${day}${hour}${minute}${second}`;
  }

  private generatePassword(timestamp: string): string {
    const data = `${this.config.shortcode}${this.config.passkey}${timestamp}`;
    return Buffer.from(data).toString('base64');
  }

  async initiateSTKPush(request: STKPushRequest): Promise<STKPushResponse> {
    const accessToken = await this.getAccessToken();
    const timestamp = this.generateTimestamp();
    const password = this.generatePassword(timestamp);

    // Ensure phone number is in correct format (254XXXXXXXXX)
    let phone = request.phone.replace(/^\+/, '');
    if (phone.startsWith('0')) {
      phone = '254' + phone.substring(1);
    }
    if (!phone.startsWith('254')) {
      throw new Error('Invalid phone number format. Must be Kenyan number.');
    }

    const payload = {
      BusinessShortCode: this.config.shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: request.amount,
      PartyA: phone,
      PartyB: this.config.shortcode,
      PhoneNumber: phone,
      CallBackURL: request.callbackUrl,
      AccountReference: request.accountReference,
      TransactionDesc: request.transactionDesc,
    };

    const response = await fetch(`${this.baseUrl}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`STK Push failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.ResponseCode !== "0") {
      throw new Error(`STK Push failed: ${data.ResponseDescription}`);
    }

    return data;
  }

  async querySTKStatus(checkoutRequestId: string): Promise<any> {
    const accessToken = await this.getAccessToken();
    const timestamp = this.generateTimestamp();
    const password = this.generatePassword(timestamp);

    const payload = {
      BusinessShortCode: this.config.shortcode,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestId,
    };

    const response = await fetch(`${this.baseUrl}/mpesa/stkpushquery/v1/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`STK Query failed: ${response.statusText}`);
    }

    return response.json();
  }

  isConfigured(): boolean {
    return !!(
      this.config.consumerKey &&
      this.config.consumerSecret &&
      this.config.shortcode &&
      this.config.passkey
    );
  }
}

export const mpesaClient = new MPesaClient();
