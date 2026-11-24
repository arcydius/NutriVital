import React, { useEffect, useRef, useState } from 'react';
import {
  MessageCircle,
  X,
  Send,
  Leaf,
  ArrowUpRight,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { ChatMessage, ClientUser, ProductCategory } from '../types/nutrivital';
import { NUTRIBOT_QUICK_CHIPS } from '../data/seedData';
import { calculateAge } from '../utils/healthAnalytics';

interface NutriBotWidgetProps {
  onSelectCategory?: (category: ProductCategory) => void;
  currentClient?: ClientUser | null;
}

const OFF_TOPIC_FALLBACK =
  'No puedo responder esto, por favor escribe una solicitud coherente con la página.';

const DOMAIN_KEYWORDS = [
  'nutrivital', 'salud', 'suplemento', 'suplementos', 'proteina', 'proteína',
  'matcha', 'omega', 'magnesio', 'ashwagandha', 'espirulina', 'colageno', 'colágeno',
  'cafe', 'café', 'cafeina', 'cafeína', 'sal', 'sodio', 'potasio', 'vitamina',
  'presion', 'presión', 'arterial', 'sistolica', 'sistólica', 'diastolica', 'diastólica',
  'latidos', 'pulsaciones', 'ritmo', 'corazon', 'corazón', 'cardiaco', 'cardíaco',
  'peso', 'imc', 'cintura', 'masa', 'vitalidad', 'higado', 'hígado', 'graso', 'esteatosis',
  'glucosa', 'trigliceridos', 'triglicéridos', 'colesterol', 'ldl', 'hdl', 'creatinina',
  'carrito', 'envio', 'envío', 'producto', 'productos', 'catalogo', 'catálogo', 'compra', 'precio',
  'informe', 'analitica', 'analítica', 'pdf', 'txt', 'reporte', 'subir', 'descargar',
  'dieta', 'caloria', 'caloría', 'calorias', 'calorías', 'nutricion', 'nutrición', 'meta', 'metas',
  'energia', 'energía', 'cansancio', 'fatiga', 'keto', 'ceto', 'grasa', 'digestion', 'digestión',
  'gluten', 'inflamacion', 'inflamación', 'adaptogeno', 'adaptógeno', 'superalimento',
  'hola', 'buenos', 'buenas', 'gracias', 'ayuda', 'como', 'cómo', 'que', 'qué', 'cual', 'cuál', 'donde', 'dónde',
];

function evaluateLocalNutriBotFallback(
  query: string,
  client?: ClientUser | null
): { text: string; category?: ProductCategory } {
  const lower = query
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  // Check if query belongs to NutriVital / Health domain
  const isGreetingOnly = /^(hola|buenos dias|buenas tardes|buenas noches|hi|hello|gracias|ok|vale)[!?. ]*$/i.test(lower);
  if (isGreetingOnly) {
    return {
      text: `¡Hola${client ? ` ${client.name.split(' ')[0]}` : ''}! Estoy listo para ayudarte con dudas sobre nuestros suplementos (Omega-3, Matcha, Café, Sal, Ashwagandha), tus biomarcadores (presión, pulsaciones, hígado graso) o tus pedidos en NutriVital.`,
    };
  }

  const hasDomainMatch = DOMAIN_KEYWORDS.some((kw) => {
    const cleanKw = kw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return lower.includes(cleanKw);
  });

  if (!hasDomainMatch) {
    return { text: OFF_TOPIC_FALLBACK };
  }

  if (lower.includes('higado') || lower.includes('graso') || lower.includes('esteatosis') || lower.includes('triglicerido')) {
    const grade = client?.biometrics.fattyLiverGrade ?? 0;
    return {
      text: `Respecto a la salud hepática${client ? ` (tu registro actual indica Hígado Graso Grado ${grade})` : ''}, recomendamos reducir azúcares simples, limitar la sal añadida y activar Omega-3 Vegano EPA+DHA junto con café funcional moderado por sus polifenoles hepatoprotectores.`,
      category: 'Suplementos Naturales',
    };
  }

  if (lower.includes('cafe') || lower.includes('cafeina')) {
    return {
      text: 'El Café Funcional Orgánico aumenta el gasto calórico (+80 kcal/día) y protege el hígado, pero puede elevar transitoriamente +4 mmHg la presión y +6 lpm el pulso. Si tienes hipertensión o taquicardia, te sugerimos moderar la dosis y apoyarte con Magnesio o Ashwagandha KSM-66.',
      category: 'Suplementos Naturales',
    };
  }

  if (lower.includes('sal') || lower.includes('sodio') || lower.includes('presion')) {
    const bp = client ? `${client.biometrics.systolicBP}/${client.biometrics.diastolicBP} mmHg` : 'tu presión actual';
    return {
      text: `Para optimizar la presión arterial (${bp}), es crucial moderar el consumo de sal refinada (que añade hasta +6 mmHg sistólicos) y equilibrar con Citrato de Potasio, Magnesio Bisglicinato y Omega-3 EPA+DHA.`,
      category: 'Suplementos Naturales',
    };
  }

  if (lower.includes('pulso') || lower.includes('pulsacion') || lower.includes('latido') || lower.includes('ritmo') || lower.includes('corazon')) {
    const hr = client ? `${client.biometrics.heartRate} lpm` : '60-80 lpm';
    return {
      text: `El rango normal en reposo es 60 a 80 lpm (tu registro: ${hr}). Puedes optimizar tu curva de pulsaciones reduciendo estimulantes nocturnos y activando Extracto KSM-66 Ashwagandha en la simulación.`,
      category: 'Suplementos Naturales',
    };
  }

  if (lower.includes('energ') || lower.includes('cansan') || lower.includes('fatiga')) {
    return {
      text: 'Para elevar tu energía celular sin nerviosismo, te recomendamos el Elixir Adaptógeno Cacao & Maca Negra junto con la Espirulina Azul por las mañanas.',
      category: 'Superalimentos',
    };
  }

  if (lower.includes('grasa') || lower.includes('peso') || lower.includes('imc') || lower.includes('keto') || lower.includes('ceto')) {
    return {
      text: 'Para planes de control de peso, IMC y metabolismo lipídico, nuestras Barras Ceto de Macadamia y la Proteína Bio-Activa Matcha sin azúcar aportan saciedad y protegen la masa magra.',
      category: 'Snacks Orgánicos',
    };
  }

  if (lower.includes('informe') || lower.includes('pdf') || lower.includes('txt') || lower.includes('reporte') || lower.includes('analitica')) {
    return {
      text: 'En la sección "Mi Salud & Biometría" puedes subir informes médicos (.PDF, .TXT o imagen). Nuestra IA extraerá biomarcadores clave y podrás descargar tus reportes formateados en .TXT y .PDF.',
    };
  }

  if (lower.includes('meta') || lower.includes('objetivo')) {
    return {
      text: 'Al subir tu informe médico en "Mi Salud & Biometría", nuestra IA analiza tus biomarcadores y calcula automáticamente metas orientativas personalizadas. Recuerda que estas metas son sugeridas por IA y no sustituyen el criterio de un médico.',
    };
  }

  if (lower.includes('envio') || lower.includes('carrito') || lower.includes('compra') || lower.includes('precio')) {
    return {
      text: 'Despachamos en 24h hábiles con empaque eco-térmico. El envío estándar cuesta $6.50 USD y es GRATIS en pedidos superiores a $90.00 USD. Puedes gestionar tus artículos desde el botón Carrito arriba a la derecha.',
      category: 'Batidos Proteicos',
    };
  }

  return {
    text: 'En NutriVital combinamos superalimentos, proteínas germinadas y analítica biométrica en tiempo real. Puedes preguntarme sobre cualquiera de nuestros productos, tus rangos médicos (presión, pulsaciones, hígado graso) o sobre tu perfil clínico.',
    category: 'Batidos Proteicos',
  };
}

export const NutriBotWidget: React.FC<NutriBotWidgetProps> = ({
  onSelectCategory,
  currentClient,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isFolded, setIsFolded] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 640 : false
  );
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'bot',
      text: '¡Hola! Soy NutriBot IA. Pregúntame únicamente sobre productos NutriVital, suplementos (como Omega-3, Café o Sal), tu biometría o informes médicos.',
      timestamp: 'Ahora',
    },
  ]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed || isTyping) return;

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

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    try {
      const userContext = currentClient
        ? {
            name: currentClient.name,
            age: calculateAge(currentClient.dateOfBirth),
            gender: currentClient.gender,
            biometrics: currentClient.biometrics,
            activeSupplements: currentClient.activeSupplements,
          }
        : undefined;

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, userContext }),
      });

      if (res.ok) {
        const data = await res.json();
        const botMsg: ChatMessage = {
          id: `bot-${Date.now() + 1}`,
          sender: 'bot',
          text: data.reply || OFF_TOPIC_FALLBACK,
          timestamp: new Date().toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
          }),
        };
        setMessages((prev) => [...prev, botMsg]);
        setIsTyping(false);
        return;
      }
    } catch {
      // Fallback to local strict domain validator
    }

    const fallback = evaluateLocalNutriBotFallback(trimmed, currentClient);
    const botMsg: ChatMessage = {
      id: `bot-${Date.now() + 1}`,
      sender: 'bot',
      text: fallback.text,
      timestamp: new Date().toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      recommendedCategory: fallback.category,
    };

    setMessages((prev) => [...prev, botMsg]);
    setIsTyping(false);
  };

  if (isFolded) {
    return (
      <div className="fixed bottom-6 right-0 z-40 transition-all duration-300">
        <button
          type="button"
          onClick={() => setIsFolded(false)}
          title="Desplegar NutriBot Asesoría"
          aria-label="Desplegar NutriBot Asesoría"
          className="flex items-center gap-1.5 pl-2.5 pr-2 py-2.5 rounded-l-2xl bg-emerald-700 hover:bg-emerald-800 text-white shadow-xl border-l-2 border-y-2 border-emerald-500/80 transition-all hover:pr-3.5 group"
        >
          <ChevronLeft className="w-4 h-4 text-[#86EFAC] group-hover:-translate-x-0.5 transition-transform" />
          <MessageCircle className="w-4 h-4 text-[#86EFAC]" />
          <span className="text-xs font-bold font-mono">NutriBot</span>
        </button>
      </div>
    );
  }

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
              <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center relative">
                <Leaf className="w-4 h-4 text-[#86EFAC]" />
                <Sparkles className="w-2.5 h-2.5 text-amber-300 absolute -top-1 -right-1" />
              </div>
              <div>
                <h3 className="text-sm font-bold leading-tight">
                  NutriBot IA Clínico
                </h3>
                <p className="text-[11px] text-emerald-100">
                  Asistente NutriVital · Dominio Restringido
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <a
                href="https://wa.me/15550192834?text=Hola%20NutriVital,%20deseo%20asesor%C3%ADa%20nutricional"
                target="_blank"
                rel="noopener noreferrer"
                title="Chatear con un especialista por WhatsApp"
                className="p-1.5 rounded-lg bg-[#25D366]/20 text-[#86EFAC] hover:bg-[#25D366] hover:text-white transition-colors"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12.031 2c-5.516 0-9.969 4.453-9.969 9.969 0 1.766.469 3.484 1.344 5l-1.406 5.156 5.281-1.375c1.469.797 3.109 1.219 4.75 1.219 5.516 0 9.969-4.453 9.969-9.969S17.547 2 12.031 2zm5.813 14.125c-.25.703-1.438 1.344-2 1.422-.516.078-1.188.141-3.344-.75-2.672-1.094-4.391-3.828-4.516-4-.125-.172-1.078-1.438-1.078-2.734s.672-1.938.922-2.203c.25-.266.547-.328.734-.328s.375.016.531.016c.172 0 .406-.063.641.484.25.578.844 2.063.922 2.219.078.156.125.344.016.563-.109.219-.156.344-.313.531-.156.188-.328.406-.469.547-.156.156-.328.328-.141.641.188.313.844 1.391 1.813 2.25 1.25 1.109 2.297 1.453 2.609 1.609.313.156.5.125.688-.094.188-.219.813-.953 1.031-1.281.219-.328.438-.281.734-.172.297.109 1.891.891 2.219 1.047.328.156.547.234.625.359.078.125.078.734-.172 1.438z" />
                </svg>
              </a>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setIsFolded(true);
                }}
                title="Plegar asistente al lateral"
                aria-label="Plegar asistente al lateral"
                className="p-1 rounded-lg text-emerald-100 hover:text-white hover:bg-emerald-600 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Cerrar ventana de NutriBot"
                className="p-1 rounded-lg text-emerald-100 hover:text-white hover:bg-emerald-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
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
            {isTyping && (
              <div className="flex items-start">
                <div className="bg-white text-emerald-700 border border-emerald-200 rounded-2xl rounded-bl-xs px-3.5 py-2 text-xs flex items-center gap-2 shadow-2xs">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>NutriBot está analizando...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
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
        <div className="flex items-center shadow-lg rounded-2xl group transition-transform hover:-translate-y-0.5">
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            aria-label="Abrir NutriBot Asistente Virtual de Nutrición"
            className="flex items-center gap-2.5 pl-4 pr-3 py-3 rounded-l-2xl bg-emerald-700 hover:bg-emerald-800 text-white transition-colors"
          >
            <MessageCircle className="w-5 h-5 text-[#86EFAC]" />
            <span className="text-xs font-semibold whitespace-nowrap">
              NutriBot Asesoría
            </span>
            <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-[#4ADE80] text-slate-950 rounded-md">
              24/7
            </span>
          </button>

          <button
            type="button"
            onClick={() => setIsFolded(true)}
            title="Plegar chatbot al lateral de la pantalla"
            aria-label="Plegar chatbot al lateral de la pantalla"
            className="pl-2 pr-2.5 py-3 rounded-r-2xl bg-emerald-800 hover:bg-emerald-900 text-emerald-200 hover:text-white border-l border-emerald-600 transition-colors flex items-center justify-center"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
