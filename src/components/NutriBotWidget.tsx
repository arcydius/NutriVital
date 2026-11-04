import React, { useState } from 'react';
import { MessageCircle, X, Send, Leaf, ArrowUpRight } from 'lucide-react';
import { ChatMessage, ProductCategory } from '../types/nutrivital';
import { NUTRIBOT_QUICK_CHIPS } from '../data/seedData';

interface NutriBotWidgetProps {
  onSelectCategory?: (category: ProductCategory) => void;
}

export const NutriBotWidget: React.FC<NutriBotWidgetProps> = ({
  onSelectCategory,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'bot',
      text: '¡Hola! Soy tu asistente de nutrición. ¿Buscas recomendaciones para energía, pérdida de grasa o digestión?',
      timestamp: 'Ahora',
    },
  ]);

  const handleChipClick = (chip: (typeof NUTRIBOT_QUICK_CHIPS)[number]) => {
    const now = new Date().toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: chip.query,
      timestamp: now,
    };

    const botMsg: ChatMessage = {
      id: `bot-${Date.now() + 1}`,
      sender: 'bot',
      text: chip.response,
      timestamp: now,
      recommendedCategory: chip.recommendedCategory,
    };

    setMessages((prev) => [...prev, userMsg, botMsg]);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    const now = new Date().toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: trimmed,
      timestamp: now,
    };

    const lower = trimmed.toLowerCase();
    let replyText =
      'Gracias por tu consulta. En esta versión interactiva de NutriVital te sugerimos combinar nuestra Proteína Bio-Activa Matcha con Omega-3 Vegano para optimizar tu metabolismo diario.';
    let category: ProductCategory | undefined = undefined;

    if (lower.includes('energ') || lower.includes('cansan') || lower.includes('fatiga')) {
      replyText =
        'Para elevar tu energía celular sin nerviosismo, te recomendamos el Elixir Adaptógeno Cacao & Maca Negra junto con la Espirulina Azul por las mañanas.';
      category = 'Superalimentos';
    } else if (lower.includes('grasa') || lower.includes('peso') || lower.includes('keto') || lower.includes('ceto')) {
      replyText =
        'Para planes de pérdida de grasa y control glucémico, nuestras Barras Ceto de Macadamia y la Proteína Matcha sin azúcar aportan saciedad prolongada.';
      category = 'Snacks Orgánicos';
    } else if (lower.includes('dige') || lower.includes('inflam') || lower.includes('gluten')) {
      replyText =
        'Para mejorar la digestión y reducir marcadores inflamatorios, prueba la Granola Germinada de Chía y el Omega-3 Vegano EPA+DHA.';
      category = 'Suplementos Naturales';
    }

    const botMsg: ChatMessage = {
      id: `bot-${Date.now() + 1}`,
      sender: 'bot',
      text: replyText,
      timestamp: now,
      recommendedCategory: category,
    };

    setMessages((prev) => [...prev, userMsg, botMsg]);
    setInputValue('');
  };

  return (
    <div className="fixed bottom-5 right-5 z-40">
      {isOpen ? (
        <div
          className="w-88 sm:w-96 bg-white rounded-2xl border border-emerald-200 shadow-xl overflow-hidden flex flex-col"
          role="dialog"
          aria-label="NutriBot - Asistente Virtual"
        >
          {/* Header */}
          <div className="bg-emerald-700 text-white px-4 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center">
                <Leaf className="w-4 h-4 text-[#86EFAC]" />
              </div>
              <div>
                <h3 className="text-sm font-bold leading-tight">
                  NutriBot - Asistente Virtual
                </h3>
                <p className="text-[11px] text-emerald-100">
                  Asesoría Nutricional Interactiva
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Cerrar ventana de NutriBot"
              className="p-1 rounded-lg text-emerald-100 hover:text-white hover:bg-emerald-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="p-4 h-72 overflow-y-auto space-y-3 bg-[#F8FAFC]">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.sender === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-emerald-600 text-white rounded-br-xs'
                      : 'bg-white text-slate-800 border border-slate-200/90 rounded-bl-xs shadow-2xs'
                  }`}
                >
                  <p>{msg.text}</p>
                  {msg.recommendedCategory && onSelectCategory && (
                    <button
                      type="button"
                      onClick={() => {
                        onSelectCategory(msg.recommendedCategory!);
                        const el = document.getElementById('catalogo');
                        el?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 underline"
                    >
                      <span>Ver {msg.recommendedCategory}</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 mt-1 px-1">
                  {msg.timestamp}
                </span>
              </div>
            ))}
          </div>

          {/* Quick Suggestion Chips */}
          <div className="px-3.5 py-2.5 bg-[#F0FDF4] border-t border-emerald-100 flex flex-wrap gap-1.5">
            {NUTRIBOT_QUICK_CHIPS.map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() => handleChipClick(chip)}
                className="px-2.5 py-1 text-[11px] font-medium bg-white text-emerald-800 border border-emerald-200 rounded-lg hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-colors whitespace-nowrap"
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <form
            onSubmit={handleSendMessage}
            className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
          >
            <label htmlFor="nutribot-input" className="sr-only">
              Escribe tu consulta nutricional
            </label>
            <input
              id="nutribot-input"
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Pregunta sobre energía, keto o envíos..."
              className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600"
            />
            <button
              type="submit"
              aria-label="Enviar consulta a NutriBot"
              className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Abrir NutriBot Asistente Virtual de Nutrición"
          className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white shadow-lg transition-transform hover:-translate-y-0.5"
        >
          <MessageCircle className="w-5 h-5 text-[#86EFAC]" />
          <span className="text-xs font-semibold whitespace-nowrap">
            NutriBot Asesoría
          </span>
          <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-[#4ADE80] text-slate-950 rounded-md">
            24/7
          </span>
        </button>
      )}
    </div>
  );
};
