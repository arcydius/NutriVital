import React, { useEffect, useState } from 'react';
import {
  User,
  X,
  Lock,
  Mail,
  Eye,
  EyeOff,
  Sparkles,
  LogIn,
} from 'lucide-react';
import {
  ClientSession,
  ClientUser,
  Gender,
} from '../types/nutrivital';
import { INITIAL_CLIENT_USERS } from '../data/seedData';

interface ClientAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentClient: ClientUser | null;
  allClients: ClientUser[];
  onLoginClient: (session: ClientSession) => void;
  onRegisterClient: (newClient: ClientUser) => void;
  onLogoutClient: () => void;
  initialMode?: 'login' | 'register';
}

export const ClientAuthModal: React.FC<ClientAuthModalProps> = ({
  isOpen,
  onClose,
  currentClient,
  allClients,
  onLoginClient,
  onRegisterClient,
  onLogoutClient,
  initialMode = 'login',
}) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>(initialMode);

  // Login Form State
  const [loginEmail, setLoginEmail] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [showLoginPassword, setShowLoginPassword] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Register Form State
  const [regName, setRegName] = useState<string>('');
  const [regEmail, setRegEmail] = useState<string>('');
  const [regPassword, setRegPassword] = useState<string>('');
  const [regDob, setRegDob] = useState<string>('');
  const [regGender, setRegGender] = useState<Gender>('Femenino');
  const [showRegPassword, setShowRegPassword] = useState<boolean>(false);
  const [regError, setRegError] = useState<string | null>(null);

  useEffect(() => {
    setActiveTab(initialMode);
    setLoginError(null);
    setRegError(null);
    setLoginEmail('');
    setLoginPassword('');
    setShowLoginPassword(false);
    setRegName('');
    setRegEmail('');
    setRegPassword('');
    setRegDob('');
    setRegGender('Femenino');
    setShowRegPassword(false);
  }, [initialMode, isOpen]);

  const demoClientIds = new Set(INITIAL_CLIENT_USERS.map((c) => c.id));
  const demoClients = allClients.filter((c) => demoClientIds.has(c.id));
  const todayIso = new Date().toISOString().split('T')[0];

  // Keyboard navigation & body scroll lock
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen || currentClient) return null;

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const normEmail = loginEmail.trim().toLowerCase();
    const matched = allClients.find(
      (c) => c.email.toLowerCase() === normEmail || c.id.toLowerCase() === normEmail
    );

    if (!matched) {
      setLoginError('No se encontró una cuenta de cliente con este correo.');
      return;
    }

    if (matched.password && matched.password !== loginPassword.trim()) {
      setLoginError('Contraseña incorrecta. Por favor intenta de nuevo.');
      return;
    }

    onLoginClient({
      userId: matched.id,
      name: matched.name,
      email: matched.email,
      role: 'Cliente',
      loggedInAt: new Date().toISOString(),
    });

    onClose();
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);

    if (!regName.trim() || !regEmail.trim()) {
      setRegError('Por favor completa tu nombre y correo.');
      return;
    }

    if (regPassword.trim().length < 6) {
      setRegError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    const emailNorm = regEmail.trim().toLowerCase();
    if (allClients.some((c) => c.email.toLowerCase() === emailNorm)) {
      setRegError('Ya existe una cuenta registrada con este correo.');
      return;
    }

    const maxClientNum = allClients.reduce((max, c) => {
      const match = /^CLI-(\d+)$/i.exec(c.id);
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0);
    const newId = `CLI-${String(maxClientNum + 1).padStart(2, '0')}`;
    const normalizedDob = regDob.trim() || undefined;
    const newClient: ClientUser = {
      id: newId,
      name: regName.trim(),
      email: emailNorm,
      password: regPassword.trim(),
      role: 'Cliente',
      createdAt: new Date().toISOString().split('T')[0],
      dateOfBirth: normalizedDob,
      gender: regGender,
      biometrics: null,
      goals: null,
      activeSupplements: [],
      medicalReports: [],
    };

    onRegisterClient(newClient);
    onLoginClient({
      userId: newClient.id,
      name: newClient.name,
      email: newClient.email,
      role: 'Cliente',
      loggedInAt: new Date().toISOString(),
    });

    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="client-auth-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-xs">
              <User className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h2 id="client-auth-title" className="text-lg font-bold">
                Acceso de Clientes
              </h2>
              <p className="text-xs text-emerald-100">
                Inicia sesión para gestionar tus pedidos e informes médicos
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="p-2 rounded-xl text-emerald-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="px-6 pt-3 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('login')}
              className={`px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-colors border-b-2 flex items-center gap-2 ${
                activeTab === 'login'
                  ? 'border-emerald-600 text-emerald-700 bg-white shadow-2xs'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Iniciar Sesión</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('register')}
              className={`px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-colors border-b-2 flex items-center gap-2 ${
                activeTab === 'register'
                  ? 'border-emerald-600 text-emerald-700 bg-white shadow-2xs'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Crear Cuenta</span>
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6">
          {activeTab === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="text-center space-y-1 mb-4">
                <h3 className="text-base font-bold text-slate-900">Bienvenido de vuelta</h3>
                <p className="text-xs text-slate-500">
                  Ingresa tu correo y contraseña para acceder a tu cuenta
                </p>
              </div>

              {loginError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
                  {loginError}
                </div>
              )}

              <div className="space-y-1">
                <label
                  htmlFor="client-login-email"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Correo Electrónico
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    id="client-login-email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="laura.morales@nutrivital.com"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="client-login-password"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    id="client-login-password"
                    name="password"
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    aria-label={showLoginPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors mt-2"
              >
                Ingresar a mi Cuenta
              </button>

              <div className="pt-4 border-t border-slate-100 text-center">
                <p className="text-xs text-slate-500 mb-2">Cuentas demo de prueba:</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {demoClients.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setLoginEmail(c.email);
                        setLoginPassword(c.password || 'Cliente2026!');
                      }}
                      className="px-2.5 py-1 text-[11px] rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-700 font-medium"
                    >
                      {c.name.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div className="text-center space-y-1 mb-4">
                <h3 className="text-base font-bold text-slate-900">Crear Cuenta de Cliente</h3>
                <p className="text-xs text-slate-500">
                  Regístrate para comprar y personalizar tu experiencia
                </p>
              </div>

              {regError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
                  {regError}
                </div>
              )}

              <div className="space-y-1">
                <label
                  htmlFor="client-reg-name"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Nombre Completo
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    id="client-reg-name"
                    name="name"
                    type="text"
                    required
                    autoComplete="name"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Ej. Andrés Ramírez"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="client-reg-email"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Correo Electrónico
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    id="client-reg-email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="andres@ejemplo.com"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label
                    htmlFor="client-reg-dob"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Fecha de Nacimiento
                  </label>
                  <input
                    id="client-reg-dob"
                    name="dateOfBirth"
                    type="date"
                    max={todayIso}
                    autoComplete="bday"
                    value={regDob}
                    onChange={(e) => setRegDob(e.target.value)}
                    onInput={(e) => setRegDob((e.target as HTMLInputElement).value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600 bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor="client-reg-gender"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Género
                  </label>
                  <select
                    id="client-reg-gender"
                    name="gender"
                    value={regGender}
                    onChange={(e) => setRegGender(e.target.value as Gender)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600 bg-white"
                  >
                    <option value="Femenino">Femenino</option>
                    <option value="Masculino">Masculino</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="client-reg-password"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    id="client-reg-password"
                    name="newPassword"
                    type={showRegPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full pl-9 pr-10 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    aria-label={showRegPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors mt-2"
              >
                Crear Mi Cuenta
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

