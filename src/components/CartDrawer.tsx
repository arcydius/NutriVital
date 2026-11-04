import React, { useState } from 'react';
import {
  ShoppingBag,
  X,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  ArrowRight,
  Truck,
} from 'lucide-react';
import { CartItem, OrderReceipt } from '../types/nutrivital';
import {
  calculateCartSummary,
  FREE_SHIPPING_THRESHOLD,
} from '../utils/analytics';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (productId: string, delta: number) => void;
  onRemoveItem: (productId: string) => void;
  onCompletePurchase: (customerName: string, customerEmail: string) => OrderReceipt | null;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onCompletePurchase,
}) => {
  const [customerName, setCustomerName] = useState('Valeria Mendoza');
  const [customerEmail, setCustomerEmail] = useState('valeria.mendoza@ejemplo.com');
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [completedReceipt, setCompletedReceipt] = useState<OrderReceipt | null>(null);

  if (!isOpen) return null;

  const summary = calculateCartSummary(items);
  const remainingForFreeShipping = Math.max(
    0,
    FREE_SHIPPING_THRESHOLD - summary.subtotal
  );

  const handleCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutError(null);

    if (items.length === 0) {
      setCheckoutError('Tu carrito está vacío.');
      return;
    }

    if (!customerName.trim() || !customerEmail.trim()) {
      setCheckoutError('Por favor completa tu nombre y correo para generar el recibo.');
      return;
    }

    const receipt = onCompletePurchase(customerName.trim(), customerEmail.trim());
    if (receipt) {
      setCompletedReceipt(receipt);
    }
  };

  const handleCloseAll = () => {
    setCompletedReceipt(null);
    setCheckoutError(null);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cart-drawer-title"
    >
      <div className="bg-white w-full max-w-md h-full shadow-2xl border-l border-slate-200 flex flex-col justify-between overflow-hidden">
        {/* Drawer Header */}
        <div className="px-6 py-5 bg-[#F0FDF4] border-b border-emerald-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5 text-emerald-700" aria-hidden="true" />
            <h2 id="cart-drawer-title" className="text-lg font-bold text-slate-900">
              Tu Carrito Saludable
            </h2>
            <span className="text-xs font-mono text-emerald-800 tabular-nums">
              · {summary.totalItems} {summary.totalItems === 1 ? 'artículo' : 'artículos'}
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
          <div className="p-6 flex-1 overflow-y-auto space-y-6">
            <div className="p-5 rounded-2xl bg-[#F0FDF4] border border-emerald-200 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <p className="text-xs font-mono text-emerald-800">
                ORDEN CONFIRMADA #{completedReceipt.id}
              </p>
              <h3 className="text-xl font-bold text-slate-900">
                ¡Gracias por tu compra, {completedReceipt.customerName}!
              </h3>
              <p className="text-xs text-slate-600">
                El inventario ha sido actualizado y la transacción se registró en las métricas de regresión lineal del Panel Administrador.
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-3">
              <div className="flex justify-between text-xs text-slate-500 border-b border-slate-200 pb-2">
                <span>Fecha: {completedReceipt.createdAt}</span>
                <span>{completedReceipt.paymentMethod}</span>
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
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl transition-colors"
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
                <div className="text-center py-14 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-slate-800">
                    Tu carrito está vacío
                  </p>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    Explora nuestro catálogo de superalimentos orgánicos, proteínas limpias y suplementos biodisponibles.
                  </p>
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

            {/* Footer Totals & Checkout Form */}
            {items.length > 0 && (
              <form
                onSubmit={handleCheckout}
                className="p-6 bg-slate-50 border-t border-slate-200 space-y-4"
              >
                {checkoutError && (
                  <p className="text-xs text-red-600 font-medium">{checkoutError}</p>
                )}

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label
                      htmlFor="checkout-name"
                      className="block text-[11px] font-medium text-slate-600 mb-1"
                    >
                      Nombre del Cliente
                    </label>
                    <input
                      id="checkout-name"
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="checkout-email"
                      className="block text-[11px] font-medium text-slate-600 mb-1"
                    >
                      Correo de Confirmación
                    </label>
                    <input
                      id="checkout-email"
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 text-xs border-t border-slate-200 pt-3">
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

                <button
                  type="submit"
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  <span>Finalizar Compra / Simular Pago</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
};
