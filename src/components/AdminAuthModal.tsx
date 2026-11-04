import React, { useState } from 'react';
import { ShieldCheck, Lock, Mail, UserPlus, KeyRound, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { AdminRole, AdminSession, AdminUser } from '../types/nutrivital';
import { authenticateAdmin } from '../utils/analytics';

interface AdminAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  adminUsers: AdminUser[];
  onLoginSuccess: (session: AdminSession) => void;
  onRegisterAdmin: (newAdmin: AdminUser) => void;
  initialMode?: 'login' | 'register';
}

export const AdminAuthModal: React.FC<AdminAuthModalProps> = ({
  isOpen,
  onClose,
  adminUsers,
  onLoginSuccess,
  onRegisterAdmin,
  initialMode = 'login',
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<AdminRole>('Administrador General');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setError(null);
      setInfoMessage(null);
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    const result = authenticateAdmin(adminUsers, email, password);
    if (!result.ok) {
      setError(result.error);
      return;
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
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedCode = inviteCode.trim().toUpperCase();

    if (!trimmedName || !trimmedEmail || !password) {
      setError('Todos los campos son obligatorios para registrar un administrador.');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (trimmedCode !== 'NV-2026') {
      setError('Código de autorización inválido. Usa el código institucional NV-2026.');
      return;
    }

    if (adminUsers.some((u) => u.email.toLowerCase() === trimmedEmail)) {
      setError('Ya existe un administrador registrado con ese correo electrónico.');
      return;
    }

    const newAdmin: AdminUser = {
      id: `ADM-0${adminUsers.length + 1}`,
      name: trimmedName,
      email: trimmedEmail,
      role,
      accessCode: trimmedCode,
      password,
      createdAt: new Date().toISOString().split('T')[0],
      lastLogin: 'Recién registrado',
    };

    onRegisterAdmin(newAdmin);

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

  const fillDemoAccount = (demoUser: AdminUser) => {
    setMode('login');
    setEmail(demoUser.email);
    setPassword(demoUser.password);
    setError(null);
    setInfoMessage(`Credenciales de ${demoUser.name} cargadas. Haz clic en "Iniciar Sesión".`);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-auth-title"
    >
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden">
        {/* Top Header */}
        <div className="bg-[#F0FDF4] border-b border-emerald-100 px-6 py-5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="admin-auth-title" className="text-lg font-bold text-slate-900">
                Acceso Administrativo NutriVital
              </h2>
              <p className="text-xs text-slate-600">
                Autenticación requerida para gestionar catálogo y modelo lineal OLS
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar ventana de autenticación"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-emerald-100/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switch Tabs */}
        <div className="px-6 pt-4">
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
                setInfoMessage(null);
              }}
              className={`py-2 px-3 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                mode === 'login'
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
              className={`py-2 px-3 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                mode === 'register'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Registrar Administrador
            </button>
          </div>
        </div>

        <div className="p-6">
          {error && (
            <div
              role="alert"
              className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {infoMessage && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{infoMessage}</span>
            </div>
          )}

          {mode === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="admin-email"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Correo Electrónico Institucional
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    id="admin-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@nutrivital.com"
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600"
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
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl transition-colors shadow-xs"
              >
                Iniciar Sesión en Panel Admin
              </button>

              {/* Quick credential selector for seamless evaluation */}
              <div className="pt-4 border-t border-slate-100">
                <p className="text-xs font-medium text-slate-500 mb-2">
                  Cuentas administrativas autorizadas (autocompletado rápido):
                </p>
                <div className="space-y-2">
                  {adminUsers.slice(0, 2).map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => fillDemoAccount(u)}
                      className="w-full text-left p-2.5 rounded-xl border border-slate-200 hover:border-emerald-400 hover:bg-[#F0FDF4] transition-colors flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-semibold text-slate-800">{u.name}</p>
                        <p className="text-slate-500 font-mono">{u.email}</p>
                      </div>
                      <span className="text-emerald-700 font-medium whitespace-nowrap">
                        Usar cuenta →
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div>
                <label
                  htmlFor="reg-name"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Nombre Completo y Cargo
                </label>
                <input
                  id="reg-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Dra. Sofía Méndez"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label
                  htmlFor="reg-email"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Correo Institucional
                </label>
                <input
                  id="reg-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="sofia@nutrivital.com"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600"
                />
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
                    value={role}
                    onChange={(e) => setRole(e.target.value as AdminRole)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-emerald-600"
                  >
                    <option value="Administrador General">Administrador General</option>
                    <option value="Directora de Nutrición">Directora de Nutrición</option>
                    <option value="Analista de Operaciones">Analista de Operaciones</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="reg-code"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Código (NV-2026)
                  </label>
                  <div className="relative">
                    <KeyRound className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      id="reg-code"
                      type="text"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
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
                <input
                  id="reg-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>Crear Cuenta y Acceder</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
