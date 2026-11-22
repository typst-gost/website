'use client';

import { useState, type FormEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Eye, EyeOff, Lock, ShieldCheck, User } from 'lucide-react';
import { PageBackground } from '@/components/decoration/background';
import { Button } from '@/components/ui/buttons/button';
import { LoadingSpinner } from '@/components/ui/spinner';

interface AdminLoginFormProps {
  redirectPath: string;
}

export function AdminLoginForm({ redirectPath }: AdminLoginFormProps) {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Заполните имя пользователя и пароль');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        detail?: string;
      };

      if (!res.ok) {
        setError(data.detail || 'Неверный имя пользователя или пароль');
        setIsLoading(false);
        return;
      }

      router.replace(redirectPath);
      router.refresh();
    } catch {
      setError('Не удалось выполнить вход. Попробуйте ещё раз.');
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4 py-12 overflow-hidden">
      <PageBackground />

      <div className="relative z-10 w-full max-w-md">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-2xl bg-slate-900/80 border border-gray-700/60 shadow-lg shadow-blue-500/10">
              <Image
                src="/logo.svg"
                alt="Typst Gost"
                width={32}
                height={32}
                className="w-8 h-8"
                priority
              />
            </div>
            <div className="text-left">
              <span className="block text-xl font-bold text-white tracking-tight">
                Typst Gost
              </span>
              <span className="block text-xs text-blue-400 font-medium">
                Панель управления
              </span>
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Вход в систему
          </h1>
          <p className="mt-2 text-sm text-gray-400">
            Авторизуйтесь для доступа к настройкам, журналам и аналитике
          </p>
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-gray-700/50 bg-slate-900/65 backdrop-blur-xl p-6 sm:p-8 shadow-2xl shadow-black/40">
          <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-blue-500/40 to-transparent" />

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="admin-username"
                className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2"
              >
                Имя пользователя
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="admin-username"
                  type="text"
                  autoComplete="username"
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                  placeholder="admin"
                  className="w-full h-11 pl-10 pr-4 rounded-xl bg-gray-950/70 border border-gray-700/60 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500/70 focus:ring-2 focus:ring-blue-500/20 transition-all disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="admin-password"
                className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2"
              >
                Пароль
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  placeholder="••••••••••••"
                  className="w-full h-11 pl-10 pr-11 rounded-xl bg-gray-950/70 border border-gray-700/60 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500/70 focus:ring-2 focus:ring-blue-500/20 transition-all disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-gray-500 hover:text-gray-200 transition-colors cursor-pointer"
                  aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
              >
                {error}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              disabled={isLoading}
              className="w-full h-11 rounded-xl text-sm font-semibold text-white shadow-lg shadow-blue-600/20"
            >
              {isLoading ? (
                <>
                  <LoadingSpinner size={18} />
                  <span>Выполняется вход...</span>
                </>
              ) : (
                <>
                  <span>Войти</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-gray-800/80 flex items-center justify-between text-xs text-gray-500">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              Защищённая сессия
            </span>
            <Link
              href="/"
              className="hover:text-gray-300 transition-colors"
            >
              На главную →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}