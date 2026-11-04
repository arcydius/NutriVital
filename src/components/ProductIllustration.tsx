import React from 'react';
import { IllustrationVariant } from '../types/nutrivital';

interface ProductIllustrationProps {
  variant: IllustrationVariant;
  className?: string;
}

export const ProductIllustration: React.FC<ProductIllustrationProps> = ({
  variant,
  className = '',
}) => {
  switch (variant) {
    case 'protein-matcha':
      return (
        <div
          className={`relative flex items-center justify-center bg-gradient-to-br from-[#F0FDF4] via-[#ECFDF5] to-[#DCFCE7] ${className}`}
        >
          <svg
            viewBox="0 0 240 200"
            className="w-44 h-40 drop-shadow-sm"
            role="img"
            aria-label="Envase minimalista de Proteína Matcha y Vainilla"
          >
            <ellipse cx="120" cy="176" rx="58" ry="8" fill="#BBF7D0" opacity="0.7" />
            {/* Botanical leaf behind jar */}
            <path
              d="M165 65 C195 55, 200 95, 165 110 C165 90, 165 75, 165 65 Z"
              fill="#4ADE80"
              opacity="0.35"
            />
            <path
              d="M75 75 C45 60, 42 102, 75 118 Z"
              fill="#86EFAC"
              opacity="0.45"
            />
            {/* Matte Cylinder Jar */}
            <rect
              x="76"
              y="46"
              width="88"
              height="124"
              rx="16"
              fill="#FFFFFF"
              stroke="#16A34A"
              strokeWidth="2"
            />
            {/* Lid */}
            <rect
              x="82"
              y="30"
              width="76"
              height="18"
              rx="6"
              fill="#15803D"
            />
            {/* Label band */}
            <rect
              x="77"
              y="74"
              width="86"
              height="68"
              fill="#F0FDF4"
            />
            <line x1="77" y1="74" x2="163" y2="74" stroke="#86EFAC" strokeWidth="1.5" />
            <line x1="77" y1="142" x2="163" y2="142" stroke="#86EFAC" strokeWidth="1.5" />
            {/* Minimalist leaf emblem */}
            <path
              d="M120 88 C132 88, 136 104, 120 114 C104 104, 108 88, 120 88 Z"
              fill="#16A34A"
            />
            <rect x="96" y="122" width="48" height="5" rx="2.5" fill="#15803D" />
            <rect x="104" y="131" width="32" height="4" rx="2" fill="#4ADE80" />
          </svg>
        </div>
      );

    case 'spirulina-jar':
      return (
        <div
          className={`relative flex items-center justify-center bg-gradient-to-br from-[#F0FDF4] via-[#E0F2FE] to-[#DCFCE7] ${className}`}
        >
          <svg
            viewBox="0 0 240 200"
            className="w-44 h-40 drop-shadow-sm"
            role="img"
            aria-label="Frasco de Espirulina Azul y Chlorella"
          >
            <ellipse cx="120" cy="176" rx="52" ry="7" fill="#A7F3D0" opacity="0.6" />
            <circle cx="172" cy="66" r="18" fill="#86EFAC" opacity="0.35" />
            <circle cx="68" cy="120" r="12" fill="#4ADE80" opacity="0.25" />
            {/* Apothecary amber/emerald jar */}
            <rect
              x="82"
              y="54"
              width="76"
              height="116"
              rx="18"
              fill="#065F46"
            />
            <rect
              x="92"
              y="36"
              width="56"
              height="20"
              rx="5"
              fill="#0F172A"
            />
            {/* Front minimalist label */}
            <rect
              x="88"
              y="78"
              width="64"
              height="68"
              rx="8"
              fill="#FFFFFF"
            />
            <circle cx="120" cy="102" r="11" fill="#10B981" opacity="0.25" />
            <circle cx="120" cy="102" r="5" fill="#059669" />
            <rect x="98" y="122" width="44" height="5" rx="2.5" fill="#065F46" />
            <rect x="105" y="132" width="30" height="4" rx="2" fill="#34D399" />
          </svg>
        </div>
      );

    case 'keto-bars':
      return (
        <div
          className={`relative flex items-center justify-center bg-gradient-to-br from-[#F8FAFC] via-[#F0FDF4] to-[#DCFCE7] ${className}`}
        >
          <svg
            viewBox="0 0 240 200"
            className="w-44 h-40 drop-shadow-sm"
            role="img"
            aria-label="Caja de Barras Ceto Cacao y Macadamia"
          >
            <ellipse cx="120" cy="176" rx="64" ry="8" fill="#BBF7D0" opacity="0.6" />
            {/* Box container */}
            <rect
              x="64"
              y="50"
              width="96"
              height="116"
              rx="12"
              fill="#FFFFFF"
              stroke="#15803D"
              strokeWidth="2"
            />
            <rect
              x="64"
              y="50"
              width="96"
              height="28"
              rx="12"
              fill="#16A34A"
            />
            {/* Floating single bar pouch */}
            <rect
              x="130"
              y="76"
              width="48"
              height="94"
              rx="8"
              fill="#15803D"
              stroke="#FFFFFF"
              strokeWidth="2"
            />
            <rect x="138" y="96" width="32" height="36" rx="4" fill="#ECFDF5" />
            <rect x="80" y="94" width="40" height="6" rx="3" fill="#15803D" />
            <rect x="80" y="106" width="32" height="4" rx="2" fill="#4ADE80" />
            <circle cx="96" cy="134" r="12" fill="#DCFCE7" stroke="#16A34A" strokeWidth="1.5" />
          </svg>
        </div>
      );

    case 'omega-capsules':
      return (
        <div
          className={`relative flex items-center justify-center bg-gradient-to-br from-[#F0FDF4] via-[#F8FAFC] to-[#D1FAE5] ${className}`}
        >
          <svg
            viewBox="0 0 240 200"
            className="w-44 h-40 drop-shadow-sm"
            role="img"
            aria-label="Frasco de Omega-3 Vegano EPA y DHA"
          >
            <ellipse cx="120" cy="176" rx="50" ry="7" fill="#A7F3D0" opacity="0.6" />
            <rect
              x="86"
              y="52"
              width="68"
              height="116"
              rx="14"
              fill="#FFFFFF"
              stroke="#059669"
              strokeWidth="2"
            />
            <rect x="96" y="34" width="48" height="18" rx="4" fill="#16A34A" />
            <rect x="92" y="76" width="56" height="66" rx="6" fill="#F0FDF4" />
            {/* Capsule icon */}
            <rect
              x="106"
              y="92"
              width="28"
              height="14"
              rx="7"
              fill="#10B981"
              transform="rotate(-25 120 99)"
            />
            <rect x="100" y="118" width="40" height="5" rx="2.5" fill="#065F46" />
            <rect x="106" y="128" width="28" height="4" rx="2" fill="#6EE7B7" />
          </svg>
        </div>
      );

    case 'cacao-maca':
      return (
        <div
          className={`relative flex items-center justify-center bg-gradient-to-br from-[#F0FDF4] via-[#FAF5FF] to-[#DCFCE7] ${className}`}
        >
          <svg
            viewBox="0 0 240 200"
            className="w-44 h-40 drop-shadow-sm"
            role="img"
            aria-label="Bolsa Doypack de Elixir Adaptógeno Cacao y Maca"
          >
            <ellipse cx="120" cy="176" rx="56" ry="8" fill="#BBF7D0" opacity="0.6" />
            {/* Stand-up pouch */}
            <path
              d="M78 40 L162 40 L170 166 C170 170, 166 172, 160 172 L80 172 C74 172, 70 170, 70 166 Z"
              fill="#FFFFFF"
              stroke="#15803D"
              strokeWidth="2"
            />
            <line x1="78" y1="52" x2="162" y2="52" stroke="#86EFAC" strokeWidth="2" />
            <rect x="84" y="72" width="72" height="72" rx="10" fill="#F0FDF4" />
            <path
              d="M120 84 C132 90, 132 108, 120 116 C108 108, 108 90, 120 84 Z"
              fill="#15803D"
            />
            <rect x="96" y="124" width="48" height="5" rx="2.5" fill="#16A34A" />
            <rect x="104" y="133" width="32" height="4" rx="2" fill="#4ADE80" />
          </svg>
        </div>
      );

    case 'collagen-peptides':
      return (
        <div
          className={`relative flex items-center justify-center bg-gradient-to-br from-[#F8FAFC] via-[#ECFDF5] to-[#D1FAE5] ${className}`}
        >
          <svg
            viewBox="0 0 240 200"
            className="w-44 h-40 drop-shadow-sm"
            role="img"
            aria-label="Tarro de Péptidos de Bio-Colágeno"
          >
            <ellipse cx="120" cy="176" rx="62" ry="8" fill="#A7F3D0" opacity="0.6" />
            <rect
              x="70"
              y="58"
              width="100"
              height="110"
              rx="18"
              fill="#FFFFFF"
              stroke="#10B981"
              strokeWidth="2"
            />
            <rect x="76" y="42" width="88" height="18" rx="6" fill="#047857" />
            <rect x="82" y="82" width="76" height="62" rx="8" fill="#ECFDF5" />
            <circle cx="120" cy="104" r="12" fill="#34D399" opacity="0.35" />
            <circle cx="120" cy="104" r="6" fill="#059669" />
            <rect x="94" y="124" width="52" height="5" rx="2.5" fill="#065F46" />
            <rect x="104" y="133" width="32" height="4" rx="2" fill="#10B981" />
          </svg>
        </div>
      );

    case 'chia-granola':
      return (
        <div
          className={`relative flex items-center justify-center bg-gradient-to-br from-[#F0FDF4] via-[#FEFCE8] to-[#DCFCE7] ${className}`}
        >
          <svg
            viewBox="0 0 240 200"
            className="w-44 h-40 drop-shadow-sm"
            role="img"
            aria-label="Empaque de Granola Germinada Chía y Cáñamo"
          >
            <ellipse cx="120" cy="176" rx="56" ry="8" fill="#BBF7D0" opacity="0.6" />
            <path
              d="M76 44 L164 44 L168 168 L72 168 Z"
              rx="10"
              fill="#FFFFFF"
              stroke="#16A34A"
              strokeWidth="2"
            />
            <rect x="76" y="44" width="88" height="20" fill="#86EFAC" />
            <circle cx="120" cy="108" r="24" fill="#F0FDF4" stroke="#4ADE80" strokeWidth="1.5" />
            <circle cx="114" cy="104" r="3" fill="#15803D" />
            <circle cx="125" cy="102" r="2.5" fill="#16A34A" />
            <circle cx="120" cy="113" r="3" fill="#15803D" />
            <rect x="92" y="142" width="56" height="5" rx="2.5" fill="#15803D" />
            <rect x="102" y="151" width="36" height="4" rx="2" fill="#4ADE80" />
          </svg>
        </div>
      );

    case 'ashwagandha-drops':
    default:
      return (
        <div
          className={`relative flex items-center justify-center bg-gradient-to-br from-[#F0FDF4] via-[#ECFDF5] to-[#A7F3D0]/40 ${className}`}
        >
          <svg
            viewBox="0 0 240 200"
            className="w-44 h-40 drop-shadow-sm"
            role="img"
            aria-label="Frasco de Ashwagandha KSM-66 y Magnesio"
          >
            <ellipse cx="120" cy="176" rx="48" ry="7" fill="#86EFAC" opacity="0.6" />
            <rect
              x="88"
              y="56"
              width="64"
              height="112"
              rx="14"
              fill="#15803D"
            />
            <rect x="98" y="38" width="44" height="18" rx="4" fill="#052E16" />
            <rect x="94" y="80" width="52" height="66" rx="6" fill="#FFFFFF" />
            <path
              d="M120 92 C127 100, 127 110, 120 116 C113 110, 113 100, 120 92 Z"
              fill="#16A34A"
            />
            <rect x="102" y="124" width="36" height="5" rx="2.5" fill="#15803D" />
            <rect x="107" y="133" width="26" height="4" rx="2" fill="#4ADE80" />
          </svg>
        </div>
      );
  }
};
