import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  Lock,
  Mail,
  UserPlus,
  KeyRound,
  X,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Users,
  ArrowRight,
  User,
} from 'lucide-react';
import { AdminRole, AdminSession, AdminUser } from '../types/nutrivital';
import { authenticateAdmin } from '../utils/analytics';

interface AdminAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  adminUsers: AdminUser[];
  onLoginSuccess: (session: AdminSession) => void;
  onRegisterAdmin: (newAdmin: AdminUser) => void;
  initialMode?: 'login' | 'register' | 'list';
  currentSession?: AdminSession | null;
}

export const AdminAuthModal: React.FC<AdminAuthModalProps> = ({
  isOpen,
  onClose,
  adminUsers,
  onLoginSuccess,
  onRegisterAdmin,
  initialMode = 'login',
  currentSession = null,
}) => {
  // Determine effective mode based on whether an admin is already logged in
  const defaultMode =
    currentSession && initialMode === 'login' ? 'list' : initialMode;
  const [mode, setMode] = useState<'login' | 'register' | 'list'>(defaultMode);

  // Dedicated Login Form States
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Dedicated Registration Form States
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regRole, setRegRole] = useState<AdminRole>('Administrador General');
  const [regCode, setRegCode] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Status feedback states
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const emailInputRef = useRef<HTMLInputElement>(null);

  // Sync mode and clear feedback when modal opens or initialMode changes
  useEffect(() => {
    if (isOpen) {
      const targetMode =
        currentSession && initialMode === 'login' ? 'list' : initialMode;
      setMode(targetMode);
      setError(null);
      setInfoMessage(null);

      // Auto-focus email input after modal animates in
      setTimeout(() => {
        emailInputRef.current?.focus();
      }, 50);

      // Prevent background scrolling while modal is open
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen, initialMode, currentSession]);

  // Handle Escape key to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Process Login
  const executeLogin = (emailToAuth: string, passToAuth: string) => {
    setError(null);
    setInfoMessage(null);

    const result = authenticateAdmin(adminUsers, emailToAuth, passToAuth);
    if (!result.ok) {
      setError(result.error);
      return false;
    }

    const session: AdminSession = {
      userId: result.user.id,
      name: result.user.name,
      email: result.user.email,
      role: result.user.role,
      loggedInAt: new Date().toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    onLoginSuccess(session);
    return true;
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeLogin(loginEmail, loginPassword);
  };

  // Process Registration
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    const trimmedName = regName.trim();
    const trimmedEmail = regEmail.trim().toLowerCase();
    const trimmedCode = regCode.trim().toUpperCase();
    const trimmedPassword = regPassword.trim();

    // Field completeness validation
    if (!trimmedName || !trimmedEmail || !trimmedPassword) {
      setError('Todos los campos son obligatorios para registrar un administrador.');
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError('Por favor ingresa un correo electrónico institucional válido (ej. admin@nutrivital.com).');
      return;
    }

    // Password length validation
    if (trimmedPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    // Institutional Authorization Code validation
    const isMasterCode = trimmedCode === 'NV-2026';
    const isExistingAdminCode = adminUsers.some(
      (u) => u.accessCode && u.accessCode.toUpperCase() === trimmedCode
    );
    if (!isMasterCode && !isExistingAdminCode) {
      setError('Código de autorización inválido. Usa el código maestro institucional NV-2026.');
      return;
    }

    // Duplicate email check
    if (adminUsers.some((u) => u.email.toLowerCase() === trimmedEmail)) {
      setError('Ya existe un administrador registrado con ese correo electrónico.');
      return;
    }

    // Generate safe, ordered ID (e.g. ADM-01, ADM-02, ADM-03)
    const highestNumber = adminUsers.reduce((max, u) => {
      const match = u.id.match(/\d+/);
      return match ? Math.max(max, parseInt(match[0], 10)) : max;
    }, 0);
    const nextNumber = highestNumber + 1;
    const generatedId = `ADM-${String(nextNumber).padStart(2, '0')}`;

    const newAdmin: AdminUser = {
      id: generatedId,
      name: trimmedName,
      email: trimmedEmail,
      role: regRole,
      accessCode: trimmedCode || 'NV-2026',
      password: trimmedPassword,
      createdAt: new Date().toISOString().split('T')[0],
      lastLogin: 'Recién registrado',
    };

    onRegisterAdmin(newAdmin);

    // If an administrator is already logged in, do not hijack their session
    if (currentSession) {
      setInfoMessage(
        `¡Administrador ${trimmedName} (${generatedId}) registrado exitosamente en el equipo!`
      );
      setRegName('');
      setRegEmail('');
      setRegCode('');
      setRegPassword('');
      return;
    }

    // If not logged in, log into the newly registered account
    const session: AdminSession = {
      userId: newAdmin.id,
      name: newAdmin.name,
      email: newAdmin.email,
      role: newAdmin.role,
      loggedInAt: new Date().toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    onLoginSuccess(session);
  };

  // Autofill login credentials from authorized demo accounts
  const handleFillDemo = (demoUser: AdminUser) => {
    setMode('login');
    setLoginEmail(demoUser.email);
    setLoginPassword(demoUser.password);
    setError(null);
    setInfoMessage(
      `Credenciales de ${demoUser.name} cargadas en el formulario. Haz clic en "Iniciar Sesión" o accede directo.`
    );
  };

  // Quick 1-click instant login for seamless testing
  const handleQuickLogin = (demoUser: AdminUser) => {
    executeLogin(demoUser.email, demoUser.password);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-auth-title"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="bg-[#F0FDF4] border-b border-emerald-100 px-6 py-5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <ShieldCheck className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="admin-auth-title" className="text-lg font-bold text-slate-900 font-display">
                {currentSession ? 'Gestión de Administradores' : 'Acceso Administrativo NutriVital'}
              </h2>
              <p className="text-xs text-slate-600">
                {currentSession
                  ? `Sesión activa como ${currentSession.name} (${currentSession.role})`
                  : 'Autenticación requerida para gestionar catálogo y analítica lineal'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar ventana de autenticación"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-emerald-100/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switch Tabs */}
        <div className="px-6 pt-4">
          <div
            className={`grid ${currentSession ? 'grid-cols-3' : 'grid-cols-2'
              } gap-1 p-1 bg-slate-100 rounded-xl text-xs font-semibold`}
          >
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
                setInfoMessage(null);
              }}
              className={`py-2 px-3 rounded-lg transition-colors whitespace-nowrap ${mode === 'login'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              Iniciar Sesión
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
                setInfoMessage(null);
              }}
              className={`py-2 px-3 rounded-lg transition-colors whitespace-nowrap ${mode === 'register'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              {currentSession ? '+ Nuevo Admin' : 'Registrar Admin'}
            </button>
            {currentSession && (
              <button
                type="button"
                onClick={() => {
                  setMode('list');
                  setError(null);
                  setInfoMessage(null);
                }}
                className={`py-2 px-3 rounded-lg transition-colors whitespace-nowrap ${mode === 'list'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                Equipo ({adminUsers.length})
              </button>
            )}
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6">
          {/* Error Banner */}
          {error && (
            <div
              role="alert"
              className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2.5 animate-in fade-in"
            >
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Success / Info Banner */}
          {infoMessage && (
            <div
              role="status"
              className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2.5 animate-in fade-in"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{infoMessage}</span>
            </div>
          )}

          {/* MODE 1: LOGIN FORM */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="admin-email"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Correo Electrónico Institucional o ID
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    ref={emailInputRef}
                    id="admin-email"
                    name="email"
                    type="text"
                    required
                    autoComplete="username"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="admin@nutrivital.com o ADM-01"
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="admin-password"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Contraseña de Administrador
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    id="admin-password"
                    name="password"
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    aria-label={showLoginPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                    className="absolute right-3 top-2.5 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl transition-colors shadow-xs flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Iniciar Sesión en Panel Admin</span>
              </button>

              {/* Quick credential selector for seamless evaluation */}
              <div className="pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-slate-700">
                    Cuentas autorizadas ({adminUsers.length}):
                  </p>
                  <span className="text-[11px] text-slate-500">Haz clic para autocompletar</span>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {adminUsers.map((u) => (
                    <div
                      key={u.id}
                      className="p-2.5 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-[#F0FDF4]/70 transition-colors flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 truncate">{u.name}</span>
                          <span className="px-1.5 py-0.5 text-[10px] rounded bg-emerald-100 text-emerald-800 font-medium whitespace-nowrap">
                            {u.role}
                          </span>
                        </div>
                        <p className="text-slate-500 font-mono text-[11px] truncate mt-0.5">
                          {u.email}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleFillDemo(u)}
                          className="px-2 py-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                        >
                          Cargar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickLogin(u)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-1"
                        >
                          <span>Acceder</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </form>
          )}

          {/* MODE 2: REGISTER FORM */}
          {mode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div>
                <label
                  htmlFor="reg-name"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Nombre Completo y Cargo
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    id="reg-name"
                    name="name"
                    type="text"
                    required
                    autoComplete="name"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Ej. Dra. Sofía Méndez"
                    className="w-full pl-9 pr-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="reg-email"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Correo Institucional
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    id="reg-email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="sofia@nutrivital.com"
                    className="w-full pl-9 pr-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="reg-role"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Rol Asignado
                  </label>
                  <select
                    id="reg-role"
                    name="role"
                    value={regRole}
                    onChange={(e) => setRegRole(e.target.value as AdminRole)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-emerald-600 font-medium"
                  >
                    <option value="Administrador General">Administrador General</option>
                    <option value="Director de Nutrición">Director de Nutrición</option>
                    <option value="Directora de Nutrición">Directora de Nutrición</option>
                    <option value="Analista de Operaciones">Analista de Operaciones</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="reg-code"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Código Institucional
                  </label>
                  <div className="relative">
                    <KeyRound className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      id="reg-code"
                      name="inviteCode"
                      type="text"
                      required
                      value={regCode}
                      onChange={(e) => setRegCode(e.target.value)}
                      placeholder="NV-2026"
                      className="w-full pl-8 pr-3 py-2 text-xs font-mono rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label
                  htmlFor="reg-password"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Contraseña Segura (mín. 6 caracteres)
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    id="reg-password"
                    name="password"
                    type={showRegPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-8 pr-10 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    aria-label={showRegPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                    className="absolute right-3 top-2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showRegPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-2 shadow-xs"
              >
                <UserPlus className="w-4 h-4" />
                <span>{currentSession ? 'Registrar Administrador' : 'Crear Cuenta y Acceder'}</span>
              </button>

              <p className="text-[11px] text-center text-slate-500">
                Código de autorización para evaluación docente: <span className="font-mono font-semibold text-emerald-700">NV-2026</span>
              </p>
            </form>
          )}

          {/* MODE 3: ADMINISTRATORS LIST (when viewing team) */}
          {mode === 'list' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-slate-700">
                  Administradores autorizados en la plataforma:
                </span>
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ Agregar nuevo</span>
                </button>
              </div>

              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {adminUsers.map((u) => (
                  <div
                    key={u.id}
                    className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-xs">{u.name}</span>
                          <span className="px-1.5 py-0.5 text-[10px] rounded bg-emerald-100 text-emerald-800 font-semibold">
                            {u.role}
                          </span>
                        </div>
                        <p className="text-slate-600 font-mono text-[11px] mt-0.5">{u.email}</p>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                        {u.id}
                      </span>
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                      <span>Último acceso: {u.lastLogin || 'No registrado'}</span>
                      <span className="font-mono text-slate-400">Código: {u.accessCode}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
