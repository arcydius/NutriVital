export type PayPalSandboxEntryMode = 'paypal' | 'card';

export type PayPalSandboxFundingChannel = 'paypal_balance' | 'sandbox_card';

export interface PayPalSandboxBuyerAccount {
  id: string;
  name: string;
  email: string;
  balanceUsd: number;
  badge: string;
  isRegisteredClient?: boolean;
}

export interface PayPalSandboxTestCard {
  id: string;
  brand: 'Visa' | 'Mastercard';
  maskedNumber: string;
  fullNumber: string;
  last4: string;
  expiry: string;
  cvv: string;
  shouldDecline: boolean;
  label: string;
}

export interface PayPalSandboxApproval {
  transactionId: string;
  payerName: string;
  payerEmail: string;
  fundingChannel: PayPalSandboxFundingChannel;
  paymentMethod: string;
}

export const SANDBOX_DEFAULT_BUYERS: PayPalSandboxBuyerAccount[] = [
  {
    id: 'sb-personal-01',
    name: 'Comprador PayPal Sandbox',
    email: 'sb-comprador@personal.example.com',
    balanceUsd: 5000.0,
    badge: 'Cuenta Personal Sandbox',
  },
  {
    id: 'sb-personal-02',
    name: 'Cliente Demo NutriVital',
    email: 'sb-nutrivital@personal.example.com',
    balanceUsd: 1850.5,
    badge: 'Cuenta Demo Sandbox',
  },
];

export const SANDBOX_TEST_CARDS: PayPalSandboxTestCard[] = [
  {
    id: 'card-visa-ok',
    brand: 'Visa',
    maskedNumber: '•••• •••• •••• 7000',
    fullNumber: '4032 0399 6854 7000',
    last4: '7000',
    expiry: '12/28',
    cvv: '123',
    shouldDecline: false,
    label: 'Visa Sandbox •••• 7000 (Aprobada)',
  },
  {
    id: 'card-mc-ok',
    brand: 'Mastercard',
    maskedNumber: '•••• •••• •••• 5100',
    fullNumber: '5105 1051 0510 5100',
    last4: '5100',
    expiry: '09/29',
    cvv: '456',
    shouldDecline: false,
    label: 'Mastercard Sandbox •••• 5100 (Aprobada)',
  },
  {
    id: 'card-visa-decline',
    brand: 'Visa',
    maskedNumber: '•••• •••• •••• 0002',
    fullNumber: '4032 0399 6854 0002',
    last4: '0002',
    expiry: '11/27',
    cvv: '999',
    shouldDecline: true,
    label: 'Visa Sandbox •••• 0002 (Simular Rechazo)',
  },
];

const TRANSACTION_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generatePayPalSandboxTransactionId(randomFn: () => number = Math.random): string {
  let suffix = '';
  for (let i = 0; i < 8; i += 1) {
    const idx = Math.floor(randomFn() * TRANSACTION_ALPHABET.length);
    suffix += TRANSACTION_ALPHABET[idx];
  }
  return `PAYID-SB-${suffix}`;
}

export function generatePayPalSandboxCheckoutToken(randomFn: () => number = Math.random): string {
  let suffix = '';
  for (let i = 0; i < 10; i += 1) {
    const idx = Math.floor(randomFn() * TRANSACTION_ALPHABET.length);
    suffix += TRANSACTION_ALPHABET[idx];
  }
  return `EC-SB${suffix}`;
}

export function buildSandboxBuyerAccounts(
  currentClient?: { id: string; name: string; email: string } | null
): PayPalSandboxBuyerAccount[] {
  if (!currentClient) {
    return SANDBOX_DEFAULT_BUYERS;
  }

  const normalizedClientEmail = currentClient.email.trim().toLowerCase();
  const linkedAccount: PayPalSandboxBuyerAccount = {
    id: `sb-client-${currentClient.id}`,
    name: currentClient.name,
    email: currentClient.email,
    balanceUsd: 5000.0,
    badge: 'Cuenta NutriVital (Sandbox)',
    isRegisteredClient: true,
  };

  const fallbackAccounts = SANDBOX_DEFAULT_BUYERS.filter(
    (acc) => acc.email.toLowerCase() !== normalizedClientEmail
  );

  return [linkedAccount, ...fallbackAccounts];
}

export function canProceedToPayPalCheckout(
  currentClient: { id: string } | null | undefined,
  cartItemsCount: number
): boolean {
  return Boolean(currentClient && cartItemsCount > 0);
}

export function formatPayPalSandboxPaymentMethod(
  channel: PayPalSandboxFundingChannel,
  transactionId: string,
  cardBrand?: string,
  cardLast4?: string
): string {
  if (channel === 'paypal_balance') {
    return `PayPal Sandbox · Saldo (${transactionId})`;
  }
  const brand = cardBrand?.trim() || 'Tarjeta';
  const last4 = cardLast4?.trim() || '7000';
  return `PayPal Sandbox · ${brand} •••• ${last4} (${transactionId})`;
}
