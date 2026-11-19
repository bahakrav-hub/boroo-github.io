import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await login(username, password);
    setIsLoading(false);

    if (result.success) {
      setUsername('');
      setPassword('');
      onClose();
    } else {
      setError(result.error || 'Ошибка входа');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-dark-green border border-gold/30 rounded-lg p-6 md:p-8 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="red-star-sm"></div>
            <h2 className="font-display text-xl md:text-2xl text-gold font-bold">
              Вход для администратора
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-paper/50 hover:text-paper text-2xl leading-none"
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-army-red/10 border border-army-red/30 rounded px-4 py-2 text-sm text-paper">
              ⚠️ {error}
            </div>
          )}

          <div>
            <label className="block font-condensed text-gold text-sm uppercase tracking-wider mb-2">
              Логин
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              autoComplete="username"
              className="w-full bg-khaki/30 border border-gold/30 rounded px-4 py-3 text-paper font-slab placeholder:text-paper/30 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/30 transition-all"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block font-condensed text-gold text-sm uppercase tracking-wider mb-2">
              Пароль
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              className="w-full bg-khaki/30 border border-gold/30 rounded px-4 py-3 text-paper font-slab placeholder:text-paper/30 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/30 transition-all"
              required
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-6 py-3 bg-army-red border border-army-red text-white font-condensed font-bold uppercase tracking-wider text-sm rounded hover:bg-army-red/80 transition-all duration-300 disabled:opacity-50"
            >
              {isLoading ? 'Вход...' : 'Войти'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-khaki/50 border border-gold/20 text-paper/70 font-condensed font-bold uppercase tracking-wider text-sm rounded hover:bg-khaki/70 transition-all duration-300"
            >
              Отмена
            </button>
          </div>
        </form>

        <div className="mt-6 pt-4 border-t border-gold/10">
          <p className="text-paper/30 text-xs font-condensed text-center">
            🔒 По умолчанию: логин <code className="text-gold/50">admin</code>, пароль <code className="text-gold/50">admin123</code>
          </p>
        </div>
      </div>
    </div>
  );
}
