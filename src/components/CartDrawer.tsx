import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  X,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  CreditCard,
  ShieldCheck,
  Truck,
  Sparkles,
  UserCheck,
  Info,
  Lock,
  LogIn,
} from 'lucide-react';
import { CartItem, ClientUser, OrderReceipt } from '../types/nutrivital';
import {
  calculateCartSummary,
  FREE_SHIPPING_THRESHOLD,
} from '../utils/analytics';
import {
  canProceedToPayPalCheckout,
  PayPalSandboxApproval,
  PayPalSandboxEntryMode,
} from '../utils/paypalSandbox';
import { PayPalSandboxModal, PayPalWordmark } from './PayPalSandboxModal';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  currentClient?: ClientUser | null;
  onUpdateQuantity: (productId: string, delta: number) => void;
  onRemoveItem: (productId: string) => void;
  onCompletePurchase: (
    customerName: string,
    customerEmail: string,
    paymentMethod?: string
  ) => OrderReceipt | null;
  onRequireLogin?: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  currentClient,
  onUpdateQuantity,
  onRemoveItem,
  onCompletePurchase,
  onRequireLogin,
}) => {
  const [paypalModalMode, setPaypalModalMode] =
    useState<PayPalSandboxEntryMode | null>(null);
  const [checkoutNotice, setCheckoutNotice] = useState<string | null>(null);
  const [completedReceipt, setCompletedReceipt] = useState<OrderReceipt | null>(null);

  useEffect(() => {
    if (!isOpen || !currentClient) {
      setPaypalModalMode(null);
    }
    if (!isOpen) {
      setCheckoutNotice(null);
    }
  }, [isOpen, currentClient]);

  const handleCloseAll = () => {
    setPaypalModalMode(null);
    setCompletedReceipt(null);
    setCheckoutNotice(null);
    onClose();
  };

  // Close drawer with Escape key (only when PayPal modal isn't open)
  useEffect(() => {
    if (!isOpen || paypalModalMode !== null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCloseAll();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, paypalModalMode]);

  if (!isOpen) return null;

  const summary = calculateCartSummary(items);
  const remainingForFreeShipping = Math.max(
    0,
    FREE_SHIPPING_THRESHOLD - summary.subtotal
  );

  const canPay = canProceedToPayPalCheckout(currentClient, items.length);

  const handleOpenPayPalSandbox = (mode: PayPalSandboxEntryMode) => {
    setCheckoutNotice(null);
    if (!currentClient) {
      setCheckoutNotice(
        'Debes iniciar sesión con tu cuenta de cliente para pagar con PayPal Sandbox.'
      );
      return;
    }
    if (items.length === 0) {
      setCheckoutNotice('Tu carrito está vacío.');
      return;
    }
    setPaypalModalMode(mode);
  };

  const handlePayPalApproved = (approval: PayPalSandboxApproval) => {
    setPaypalModalMode(null);
    setCheckoutNotice(null);
    const receipt = onCompletePurchase(
      approval.payerName,
      approval.payerEmail,
      approval.paymentMethod
    );
    if (receipt) {
      setCompletedReceipt(receipt);
    }
  };

  const handlePayPalCancelled = () => {
    setPaypalModalMode(null);
    setCheckoutNotice(
      'Pago en PayPal Sandbox cancelado. Tus productos siguen guardados en el carrito.'
    );
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs transition-opacity duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-drawer-title"
        onClick={handleCloseAll}
      >
        <div
          className="bg-white w-full max-w-md h-full shadow-2xl border-l border-slate-200 flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Drawer Header */}
          <div className="px-6 py-5 bg-[#F0FDF4] border-b border-emerald-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ShoppingBag className="w-5 h-5 text-emerald-700" aria-hidden="true" />
              <h2 id="cart-drawer-title" className="text-lg font-bold text-slate-900">
                Tu Carrito Saludable
              </h2>
              <span className="text-xs font-mono text-emerald-800 tabular-nums">
                · {summary.totalItems}{' '}
                {summary.totalItems === 1 ? 'artículo' : 'artículos'}
              </span>
            </div>
            <button
              type="button"
              onClick={handleCloseAll}
              aria-label="Cerrar carrito de compras"
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-emerald-100/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Receipt Confirmation View OR Active Cart View */}
          {completedReceipt ? (
            <div className="p-6 flex-1 overflow-y-auto space-y-5">
              <div className="p-5 rounded-2xl bg-[#F0FDF4] border border-emerald-200 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <p className="text-xs font-mono text-emerald-800">
                  ORDEN CONFIRMADA #{completedReceipt.id}
                </p>
                <h3 className="text-xl font-bold text-slate-900">
                  ¡Pago aprobado, {completedReceipt.customerName}!
                </h3>
                <p className="text-xs text-slate-600">
                  Tu pago simulado en PayPal Sandbox fue verificado y el paquete eco-térmico se despachará en las próximas 24 horas.
                </p>
              </div>

              {/* PayPal Sandbox Verification Card */}
              <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 space-y-1.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <PayPalWordmark className="text-sm" />
                    <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-mono text-[10px] font-semibold">
                      SANDBOX
                    </span>
                  </div>
                  <span className="text-emerald-700 font-semibold text-[11px]">
                    Pago Aprobado
                  </span>
                </div>
                <p className="font-mono text-[11px] text-slate-700 break-all">
                  {completedReceipt.paymentMethod}
                </p>
                <p className="text-[11px] text-slate-500">
                  Cuenta pagadora: <span className="font-mono">{completedReceipt.customerEmail}</span>
                </p>
              </div>

              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-3">
                <div className="flex justify-between text-xs text-slate-500 border-b border-slate-200 pb-2">
                  <span>Fecha: {completedReceipt.createdAt}</span>
                  <span className="font-mono">#{completedReceipt.id}</span>
                </div>

                <div className="space-y-2">
                  {completedReceipt.items.map((item) => (
                    <div
                      key={item.productId}
                      className="flex justify-between items-center text-xs"
                    >
                      <span className="text-slate-800 font-medium">
                        {item.quantity}x {item.name}
                      </span>
                      <span className="font-mono tabular-nums text-slate-900">
                        ${item.lineTotal.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-slate-200 pt-2.5 space-y-1 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal</span>
                    <span className="font-mono tabular-nums">
                      ${completedReceipt.subtotal.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Impuestos (IVA 16%)</span>
                    <span className="font-mono tabular-nums">
                      ${completedReceipt.tax.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Envío Eco-Térmico</span>
                    <span className="font-mono tabular-nums">
                      {completedReceipt.shipping === 0
                        ? 'GRATIS'
                        : `$${completedReceipt.shipping.toFixed(2)}`}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-slate-900 pt-1.5 border-t border-slate-200">
                    <span>Total Pagado</span>
                    <span className="font-mono tabular-nums text-emerald-700">
                      ${completedReceipt.total.toFixed(2)} USD
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCloseAll}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl transition-colors cursor-pointer"
              >
                Continuar Explorando NutriVital
              </button>
            </div>
          ) : (
            <>
              {/* Free shipping progress bar */}
              <div className="px-6 py-3 bg-slate-50 border-b border-slate-200/80 text-xs text-slate-600 flex items-center gap-2">
                <Truck className="w-4 h-4 text-emerald-600 shrink-0" />
                {remainingForFreeShipping > 0 ? (
                  <span>
                    Añade{' '}
                    <strong className="font-mono text-slate-900">
                      ${remainingForFreeShipping.toFixed(2)}
                    </strong>{' '}
                    más para obtener <strong>Envío Gratis</strong>.
                  </span>
                ) : (
                  <span className="text-emerald-800 font-medium">
                    ¡Felicidades! Tu pedido califica para Envío Eco-Térmico Gratis.
                  </span>
                )}
              </div>

              {/* Cart Items List */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {items.length === 0 ? (
                  <div className="text-center py-12 px-4 space-y-4">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-2xs">
                      <ShoppingBag className="w-7 h-7" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-base font-bold text-slate-800">
                        Tu carrito está vacío
                      </p>
                      <p className="text-xs text-slate-500 max-w-xs mx-auto">
                        Explora nuestro catálogo de superalimentos orgánicos, proteínas limpias y suplementos biodisponibles.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        handleCloseAll();
                        setTimeout(() => {
                          document
                            .getElementById('catalogo')
                            ?.scrollIntoView({ behavior: 'smooth' });
                        }, 50);
                      }}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
                      <span>Explorar Catálogo Saludable</span>
                    </button>
                  </div>
                ) : (
                  items.map(({ product, quantity }) => (
                    <div
                      key={product.id}
                      className="p-3.5 rounded-2xl border border-slate-200 bg-white flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-emerald-700 font-medium">
                          {product.category}
                        </p>
                        <h3 className="text-sm font-semibold text-slate-900 truncate">
                          {product.name}
                        </h3>
                        <p className="text-xs text-slate-500 font-mono tabular-nums mt-0.5">
                          ${product.price.toFixed(2)} c/u · Stock disp: {product.stock}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(product.id, -1)}
                          aria-label={`Disminuir cantidad de ${product.name}`}
                          className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-7 text-center text-xs font-mono font-semibold tabular-nums">
                          {quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(product.id, 1)}
                          disabled={quantity >= product.stock}
                          aria-label={`Aumentar cantidad de ${product.name}`}
                          className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemoveItem(product.id)}
                          aria-label={`Eliminar ${product.name} del carrito`}
                          className="w-7 h-7 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center ml-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer Totals & PayPal Sandbox Checkout */}
              {items.length > 0 && (
                <div className="p-5 bg-slate-50 border-t border-slate-200 space-y-3.5">
                  {checkoutNotice && (
                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
                      <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <span>{checkoutNotice}</span>
                    </div>
                  )}

                  {/* Active Session Info OR Login Required Gate */}
                  {currentClient ? (
                    <div className="px-3 py-2 rounded-xl bg-emerald-50/80 border border-emerald-200/80 flex items-center gap-2 text-[11px] text-emerald-900">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                      <span className="truncate">
                        Pedido para <strong>{currentClient.name}</strong> ({currentClient.email})
                      </span>
                    </div>
                  ) : (
                    <div
                      data-testid="cart-login-required-gate"
                      className="p-3.5 rounded-xl bg-amber-50/90 border border-amber-200 space-y-2.5"
                    >
                      <div className="flex items-start gap-2">
                        <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-amber-950">
                            Inicia sesión para realizar el pago
                          </p>
                          <p className="text-[11px] text-amber-900/90 leading-snug">
                            Debes iniciar sesión con tu cuenta para habilitar PayPal Sandbox y vincular el pedido. Tu carrito se guardará automáticamente.
                          </p>
                        </div>
                      </div>
                      {onRequireLogin && (
                        <button
                          type="button"
                          data-testid="cart-require-login-btn"
                          onClick={onRequireLogin}
                          className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                        >
                          <LogIn className="w-4 h-4" />
                          <span>Iniciar Sesión o Crear Cuenta</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Order Summary */}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal</span>
                      <span className="font-mono tabular-nums">
                        ${summary.subtotal.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Impuestos estimados (16% IVA)</span>
                      <span className="font-mono tabular-nums">
                        ${summary.tax.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Envío Eco-Térmico</span>
                      <span className="font-mono tabular-nums">
                        {summary.shipping === 0
                          ? 'GRATIS'
                          : `$${summary.shipping.toFixed(2)}`}
                      </span>
                    </div>
                    <div className="flex justify-between text-base font-bold text-slate-900 pt-2 border-t border-slate-200">
                      <span>Total a Pagar</span>
                      <span className="font-mono tabular-nums text-emerald-700">
                        ${summary.total.toFixed(2)} USD
                      </span>
                    </div>
                  </div>

                  {/* PayPal Sandbox Smart Payment Buttons (Enabled ONLY when authenticated) */}
                  <div className="space-y-2 pt-1">
                    {canPay ? (
                      <>
                        <button
                          type="button"
                          data-testid="paypal-sandbox-btn"
                          onClick={() => handleOpenPayPalSandbox('paypal')}
                          className="w-full py-2.5 px-4 bg-[#FFC439] hover:bg-[#F5B82E] active:bg-[#E8AC22] text-[#003087] font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm border border-[#E6B02E] cursor-pointer"
                        >
                          <span className="text-xs font-semibold text-[#003087]/90">
                            Pagar con
                          </span>
                          <PayPalWordmark className="text-lg" />
                          <span className="px-1.5 py-0.5 rounded bg-[#003087]/10 text-[#003087] font-mono text-[10px] font-bold">
                            SANDBOX
                          </span>
                        </button>

                        <button
                          type="button"
                          data-testid="paypal-sandbox-card-btn"
                          onClick={() => handleOpenPayPalSandbox('card')}
                          className="w-full py-2.5 px-4 bg-[#2C2E2F] hover:bg-[#1E2021] text-white font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                        >
                          <CreditCard className="w-4 h-4 text-slate-200" />
                          <span>Tarjeta de Débito o Crédito (Sandbox)</span>
                        </button>

                        <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5 pt-0.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-[#0070BA] shrink-0" />
                          <span>Simulación PayPal Sandbox · Sin cobros reales</span>
                        </p>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          disabled
                          aria-disabled="true"
                          data-testid="paypal-sandbox-btn-locked"
                          title="Inicia sesión para habilitar el pago con PayPal Sandbox"
                          className="w-full py-2.5 px-4 bg-[#FFC439]/50 text-[#003087]/70 font-bold text-sm rounded-xl border border-[#E6B02E]/40 flex items-center justify-center gap-2 cursor-not-allowed select-none"
                        >
                          <Lock className="w-3.5 h-3.5 shrink-0" />
                          <span className="text-xs font-semibold">Pagar con</span>
                          <PayPalWordmark className="text-base opacity-70" />
                          <span className="px-1.5 py-0.5 rounded bg-[#003087]/10 font-mono text-[10px] font-bold">
                            BLOQUEADO
                          </span>
                        </button>

                        <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
                          <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>Inicia sesión arriba para desbloquear PayPal Sandbox</span>
                        </p>
                      </>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Interactive PayPal Sandbox Checkout Modal (only when authenticated) */}
      <PayPalSandboxModal
        isOpen={Boolean(currentClient) && paypalModalMode !== null}
        initialMode={paypalModalMode ?? 'paypal'}
        items={items}
        summary={summary}
        currentClient={currentClient}
        onCancel={handlePayPalCancelled}
        onApprove={handlePayPalApproved}
      />
    </>
  );
};
