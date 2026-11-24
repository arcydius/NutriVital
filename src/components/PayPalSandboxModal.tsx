import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Loader2,
  Lock,
  ShieldCheck,
  ShoppingCart,
  UserCheck,
  Wallet,
  X,
} from 'lucide-react';
import { CartItem, CartSummary, ClientUser } from '../types/nutrivital';
import {
  buildSandboxBuyerAccounts,
  formatPayPalSandboxPaymentMethod,
  generatePayPalSandboxCheckoutToken,
  generatePayPalSandboxTransactionId,
  PayPalSandboxApproval,
  PayPalSandboxEntryMode,
  PayPalSandboxFundingChannel,
  SANDBOX_TEST_CARDS,
} from '../utils/paypalSandbox';

export const PayPalWordmark: React.FC<{ className?: string }> = ({ className = 'text-base' }) => (
  <span className={`inline-flex items-baseline font-extrabold italic tracking-tight select-none ${className}`}>
    <span className="text-[#003087]">Pay</span>
    <span className="text-[#0079C1]">Pal</span>
  </span>
);

interface PayPalSandboxModalProps {
  isOpen: boolean;
  initialMode: PayPalSandboxEntryMode;
  items: CartItem[];
  summary: CartSummary;
  currentClient?: ClientUser | null;
  onCancel: () => void;
  onApprove: (approval: PayPalSandboxApproval) => void;
}

type SandboxStep = 'login' | 'review' | 'card' | 'processing' | 'declined';

export const PayPalSandboxModal: React.FC<PayPalSandboxModalProps> = ({
  isOpen,
  initialMode,
  items,
  summary,
  currentClient,
  onCancel,
  onApprove,
}) => {
  const buyerAccounts = useMemo(
    () => (currentClient ? [buildSandboxBuyerAccounts(currentClient)[0]] : []),
    [currentClient]
  );

  const [step, setStep] = useState<SandboxStep>(initialMode === 'card' ? 'card' : 'login');
  const [returnStepOnRetry, setReturnStepOnRetry] = useState<'review' | 'card'>('review');
  const [selectedBuyerId, setSelectedBuyerId] = useState<string>(buyerAccounts[0]?.id ?? '');
  const [fundingChannel, setFundingChannel] = useState<PayPalSandboxFundingChannel>('paypal_balance');
  const [selectedCardId, setSelectedCardId] = useState<string>(SANDBOX_TEST_CARDS[0].id);
  const [showOrderBreakdown, setShowOrderBreakdown] = useState<boolean>(false);
  const [checkoutToken, setCheckoutToken] = useState<string>(() =>
    generatePayPalSandboxCheckoutToken()
  );
  const [processingLabel, setProcessingLabel] = useState<string>(
    'Conectando con PayPal Sandbox...'
  );

  const timerRef = useRef<number | null>(null);
  const statusTimerRef = useRef<number | null>(null);

  const clearTimers = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (statusTimerRef.current !== null) {
      window.clearTimeout(statusTimerRef.current);
      statusTimerRef.current = null;
    }
  };

  useEffect(() => {
    if (!isOpen || !currentClient || buyerAccounts.length === 0) {
      clearTimers();
      return;
    }

    setStep(initialMode === 'card' ? 'card' : 'login');
    setReturnStepOnRetry(initialMode === 'card' ? 'card' : 'review');
    setSelectedBuyerId(buyerAccounts[0].id);
    setFundingChannel('paypal_balance');
    setSelectedCardId(SANDBOX_TEST_CARDS[0].id);
    setShowOrderBreakdown(false);
    setCheckoutToken(generatePayPalSandboxCheckoutToken());

    return () => {
      clearTimers();
    };
  }, [isOpen, initialMode, currentClient, buyerAccounts]);

  useEffect(() => {
    if (!isOpen || !currentClient) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && step !== 'processing') {
        e.stopPropagation();
        clearTimers();
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, currentClient, step, onCancel]);

  if (!isOpen || !currentClient || buyerAccounts.length === 0) return null;

  const selectedBuyer =
    buyerAccounts.find((acc) => acc.id === selectedBuyerId) ?? buyerAccounts[0];
  const selectedCard =
    SANDBOX_TEST_CARDS.find((card) => card.id === selectedCardId) ?? SANDBOX_TEST_CARDS[0];

  const handleAuthorizePayment = (options: {
    channel: PayPalSandboxFundingChannel;
    forceDecline?: boolean;
    retryTarget: 'review' | 'card';
  }) => {
    clearTimers();
    setReturnStepOnRetry(options.retryTarget);
    setProcessingLabel('Conectando con PayPal Sandbox...');
    setStep('processing');

    statusTimerRef.current = window.setTimeout(() => {
      setProcessingLabel('Autorizando transacción simulada...');
    }, 420);

    timerRef.current = window.setTimeout(() => {
      const shouldDecline =
        Boolean(options.forceDecline) ||
        (options.channel === 'sandbox_card' && selectedCard.shouldDecline);

      if (shouldDecline) {
        setStep('declined');
        return;
      }

      const transactionId = generatePayPalSandboxTransactionId();
      const paymentMethod = formatPayPalSandboxPaymentMethod(
        options.channel,
        transactionId,
        selectedCard.brand,
        selectedCard.last4
      );

      onApprove({
        transactionId,
        payerName: selectedBuyer.name,
        payerEmail: selectedBuyer.email,
        fundingChannel: options.channel,
        paymentMethod,
      });
    }, 950);
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/65 backdrop-blur-xs p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="paypal-sandbox-title"
      onClick={() => {
        if (step !== 'processing') {
          clearTimers();
          onCancel();
        }
      }}
    >
      <div
        className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Simulated PayPal Sandbox Browser Bar */}
        <div className="bg-slate-900 text-slate-200 px-3.5 py-2 flex items-center justify-between gap-2 text-[11px]">
          <div className="flex items-center gap-1.5 min-w-0">
            <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="font-mono truncate text-slate-300">
              sandbox.paypal.com/checkoutnow?token={checkoutToken}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 font-mono text-[10px] font-semibold">
              SANDBOX
            </span>
            {step !== 'processing' && (
              <button
                type="button"
                onClick={() => {
                  clearTimers();
                  onCancel();
                }}
                aria-label="Cerrar ventana de PayPal Sandbox"
                className="p-0.5 rounded hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* PayPal Header + Collapsible Order Total */}
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <PayPalWordmark className="text-xl" />
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-50 text-[#003087] border border-blue-200">
                Simulador
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowOrderBreakdown((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-xs font-bold text-slate-900 font-mono tabular-nums transition-colors"
              aria-expanded={showOrderBreakdown}
            >
              <ShoppingCart className="w-3.5 h-3.5 text-[#0070BA]" />
              <span>${summary.total.toFixed(2)} USD</span>
              {showOrderBreakdown ? (
                <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>
          </div>

          {showOrderBreakdown && (
            <div className="mt-3 pt-3 border-t border-slate-200 space-y-1.5 text-xs">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                Comercio: NutriVital Store (Sandbox)
              </p>
              {items.map(({ product, quantity }) => (
                <div key={product.id} className="flex justify-between text-slate-700">
                  <span className="truncate pr-2">
                    {quantity}x {product.name}
                  </span>
                  <span className="font-mono tabular-nums shrink-0">
                    ${(product.price * quantity).toFixed(2)}
                  </span>
                </div>
              ))}
              <div className="pt-1.5 border-t border-slate-200/80 space-y-0.5 text-[11px] text-slate-500">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-mono tabular-nums">${summary.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>IVA (16%)</span>
                  <span className="font-mono tabular-nums">${summary.tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Envío Eco-Térmico</span>
                  <span className="font-mono tabular-nums">
                    {summary.shipping === 0 ? 'GRATIS' : `$${summary.shipping.toFixed(2)}`}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Body Steps */}
        <div className="p-5">
          {step === 'login' && (
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <h3 id="paypal-sandbox-title" className="text-lg font-bold text-slate-900">
                  Pagar con PayPal Sandbox
                </h3>
                <p className="text-xs text-slate-500">
                  Verifica tu cuenta vinculada de NutriVital para autorizar el pago simulado en modo Sandbox.
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Cuenta Comprador Sandbox
                </p>
                {buyerAccounts.map((account) => {
                  const isSelected = account.id === selectedBuyer.id;
                  return (
                    <button
                      key={account.id}
                      type="button"
                      onClick={() => setSelectedBuyerId(account.id)}
                      className={`w-full text-left p-3 rounded-xl border transition-all flex items-start justify-between gap-2 ${
                        isSelected
                          ? 'border-[#0070BA] bg-blue-50/60 ring-2 ring-[#0070BA]/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {account.name}
                          </span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                              account.isRegisteredClient
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {account.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 font-mono truncate mt-0.5">
                          {account.email}
                        </p>
                      </div>
                      <span className="text-[11px] font-mono font-semibold text-[#003087] shrink-0 tabular-nums">
                        ${account.balanceUsd.toFixed(2)}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                <span className="text-slate-500">Contraseña Sandbox</span>
                <span className="font-mono text-slate-800 tracking-widest">••••••••••••</span>
              </div>

              <button
                type="button"
                data-testid="paypal-sandbox-login-submit"
                onClick={() => setStep('review')}
                className="w-full py-3 px-4 rounded-full bg-[#0070BA] hover:bg-[#005EA6] text-white font-bold text-sm transition-colors shadow-sm cursor-pointer"
              >
                Iniciar sesión en PayPal Sandbox
              </button>

              <div className="flex items-center justify-between pt-1 text-xs">
                <button
                  type="button"
                  onClick={() => setStep('card')}
                  className="text-[#0070BA] hover:underline font-medium"
                >
                  Pagar con tarjeta de prueba
                </button>
                <button
                  type="button"
                  onClick={onCancel}
                  className="text-slate-500 hover:text-slate-800"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {step === 'review' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-[#003087] flex items-center justify-center shrink-0">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p id="paypal-sandbox-title" className="text-xs font-bold text-slate-900 truncate">
                      {selectedBuyer.name}
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono truncate">
                      {selectedBuyer.email}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStep('login')}
                  className="text-[11px] font-semibold text-[#0070BA] hover:underline shrink-0"
                >
                  Ver cuenta
                </button>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs flex items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-emerald-900">NutriVital Store (Sandbox)</p>
                  <p className="text-[11px] text-emerald-700">
                    {summary.totalItems}{' '}
                    {summary.totalItems === 1 ? 'producto' : 'productos'} · Despacho Eco-Térmico 24h
                  </p>
                </div>
                <span className="font-mono font-bold text-emerald-800 text-sm tabular-nums">
                  ${summary.total.toFixed(2)}
                </span>
              </div>

              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Forma de pago en Sandbox
                </p>

                <button
                  type="button"
                  onClick={() => setFundingChannel('paypal_balance')}
                  className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                    fundingChannel === 'paypal_balance'
                      ? 'border-[#0070BA] bg-blue-50/60 ring-2 ring-[#0070BA]/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#003087] text-white flex items-center justify-center">
                      <Wallet className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">Saldo de PayPal Sandbox</p>
                      <p className="text-[11px] text-slate-500 font-mono">
                        Disponible: ${selectedBuyer.balanceUsd.toFixed(2)} USD
                      </p>
                    </div>
                  </div>
                  <CheckCircle2
                    className={`w-4 h-4 shrink-0 ${
                      fundingChannel === 'paypal_balance' ? 'text-[#0070BA]' : 'text-slate-200'
                    }`}
                  />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setFundingChannel('sandbox_card');
                    setSelectedCardId(SANDBOX_TEST_CARDS[0].id);
                  }}
                  className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                    fundingChannel === 'sandbox_card'
                      ? 'border-[#0070BA] bg-blue-50/60 ring-2 ring-[#0070BA]/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-slate-800 text-white flex items-center justify-center">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">Visa Sandbox •••• 7000</p>
                      <p className="text-[11px] text-slate-500">
                        Tarjeta de débito/crédito de prueba vinculada
                      </p>
                    </div>
                  </div>
                  <CheckCircle2
                    className={`w-4 h-4 shrink-0 ${
                      fundingChannel === 'sandbox_card' ? 'text-[#0070BA]' : 'text-slate-200'
                    }`}
                  />
                </button>
              </div>

              <button
                type="button"
                data-testid="paypal-sandbox-complete-btn"
                onClick={() =>
                  handleAuthorizePayment({
                    channel: fundingChannel,
                    retryTarget: 'review',
                  })
                }
                className="w-full py-3 px-4 rounded-full bg-[#0070BA] hover:bg-[#005EA6] text-white font-bold text-sm transition-colors shadow-sm cursor-pointer"
              >
                Completar Compra (${summary.total.toFixed(2)} USD)
              </button>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <button
                  type="button"
                  onClick={() =>
                    handleAuthorizePayment({
                      channel: fundingChannel,
                      forceDecline: true,
                      retryTarget: 'review',
                    })
                  }
                  className="text-amber-700 hover:text-amber-900 hover:underline font-medium"
                >
                  Simular pago rechazado (QA)
                </button>
                <button
                  type="button"
                  onClick={onCancel}
                  className="text-slate-500 hover:text-slate-800"
                >
                  Cancelar y volver
                </button>
              </div>
            </div>
          )}

          {step === 'card' && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 id="paypal-sandbox-title" className="text-base font-bold text-slate-900">
                  Tarjeta de Prueba (PayPal Sandbox)
                </h3>
                <p className="text-xs text-slate-500">
                  Elige una tarjeta de prueba precargada para simular el cobro sin ingresar datos reales.
                </p>
              </div>

              <div className="space-y-1.5">
                {SANDBOX_TEST_CARDS.map((card) => {
                  const isSelected = card.id === selectedCard.id;
                  return (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => setSelectedCardId(card.id)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 transition-all ${
                        isSelected
                          ? card.shouldDecline
                            ? 'border-amber-500 bg-amber-50/70 ring-2 ring-amber-400/25'
                            : 'border-[#0070BA] bg-blue-50/60 ring-2 ring-[#0070BA]/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <CreditCard
                          className={`w-4 h-4 ${
                            card.shouldDecline ? 'text-amber-600' : 'text-[#003087]'
                          }`}
                        />
                        <span className="font-semibold text-slate-900">{card.label}</span>
                      </div>
                      <span className="font-mono text-[11px] text-slate-500">{card.expiry}</span>
                    </button>
                  );
                })}
              </div>

              {/* Pre-filled Sandbox Card Preview */}
              <div className="p-3.5 rounded-xl bg-slate-900 text-white space-y-3 shadow-inner">
                <div className="flex items-center justify-between text-[11px] text-slate-300">
                  <span className="font-semibold uppercase tracking-wider">
                    {selectedCard.brand} · Sandbox Test Card
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[10px]">
                    DEMO
                  </span>
                </div>
                <p className="font-mono text-sm tracking-widest text-white">
                  {selectedCard.fullNumber}
                </p>
                <div className="flex items-center justify-between text-[11px] text-slate-300">
                  <span className="truncate pr-2">{selectedBuyer.name}</span>
                  <span className="font-mono shrink-0">
                    Vence {selectedCard.expiry} · CVV {selectedCard.cvv}
                  </span>
                </div>
              </div>

              <button
                type="button"
                data-testid="paypal-sandbox-card-pay-btn"
                onClick={() =>
                  handleAuthorizePayment({
                    channel: 'sandbox_card',
                    retryTarget: 'card',
                  })
                }
                className="w-full py-3 px-4 rounded-full bg-[#2C2E2F] hover:bg-[#1A1C1D] text-white font-bold text-sm transition-colors shadow-sm cursor-pointer"
              >
                Pagar Ahora (${summary.total.toFixed(2)} USD)
              </button>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => setStep('login')}
                  className="text-[#0070BA] hover:underline font-medium"
                >
                  Usar cuenta PayPal Sandbox
                </button>
                <button
                  type="button"
                  onClick={onCancel}
                  className="text-slate-500 hover:text-slate-800"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {step === 'processing' && (
            <div className="py-10 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto">
                <Loader2 className="w-7 h-7 text-[#0070BA] animate-spin" />
              </div>
              <div className="space-y-1">
                <h3 id="paypal-sandbox-title" className="text-base font-bold text-slate-900">
                  {processingLabel}
                </h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Validando orden de prueba por{' '}
                  <strong className="font-mono text-slate-800">
                    ${summary.total.toFixed(2)} USD
                  </strong>{' '}
                  en entorno PayPal Sandbox.
                </p>
              </div>
            </div>
          )}

          {step === 'declined' && (
            <div className="py-4 space-y-4 text-center">
              <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h3 id="paypal-sandbox-title" className="text-base font-bold text-slate-900">
                  Pago rechazado en PayPal Sandbox
                </h3>
                <p className="text-[11px] font-mono text-amber-800 bg-amber-50 border border-amber-200 inline-block px-2.5 py-1 rounded-lg">
                  INSTRUMENT_DECLINED · Simulación Sandbox
                </p>
                <p className="text-xs text-slate-600 max-w-xs mx-auto">
                  No se procesó el pedido ni se modificó el stock. Selecciona otro método de prueba para continuar.
                </p>
              </div>
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    if (returnStepOnRetry === 'card') {
                      setSelectedCardId(SANDBOX_TEST_CARDS[0].id);
                      setStep('card');
                    } else {
                      setStep('review');
                    }
                  }}
                  className="w-full py-2.5 px-4 rounded-full bg-[#0070BA] hover:bg-[#005EA6] text-white font-semibold text-xs transition-colors"
                >
                  Intentar con otro método Sandbox
                </button>
                <button
                  type="button"
                  onClick={onCancel}
                  className="w-full py-2 px-4 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium text-xs transition-colors"
                >
                  Volver al carrito
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sandbox Footer Disclaimer */}
        <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-[#0070BA] shrink-0" />
          <span>Entorno de pruebas PayPal Sandbox · No se realizan cobros reales</span>
        </div>
      </div>
    </div>
  );
};
