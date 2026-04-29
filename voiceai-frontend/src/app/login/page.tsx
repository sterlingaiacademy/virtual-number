'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { PhoneCall, Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex">
      {/* Left — branding */}
      <div className="hidden lg:flex flex-1 flex-col justify-between p-12 bg-gradient-to-br from-purple-950/30 to-[#0a0a0f] border-r border-[#1e1e2e]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
            <PhoneCall className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white">VoiceAI</span>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-white leading-tight">
              AI Phone Agents<br />
              <span className="gradient-text">for Indian Businesses</span>
            </h1>
            <p className="text-[#8888aa] text-lg">
              Give every customer call the best AI-powered experience in their language.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Calls Handled', value: '2.4M+' },
              { label: 'Languages', value: '12' },
              { label: 'Businesses', value: '850+' },
              { label: 'Uptime', value: '99.9%' },
            ].map((stat) => (
              <div key={stat.label} className="card p-4">
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <div className="text-[#8888aa] text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[#555570] text-sm">
          © 2025 VoiceAI · sterlingaiacademy.com
        </p>
      </div>

      {/* Right — login form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <PhoneCall className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">VoiceAI</span>
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-white">Welcome back</h2>
            <p className="text-[#8888aa]">Sign in to your dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            <div>
              <label className="label">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555570]" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input pl-10"
                  placeholder="admin@company.com"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555570]" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-10 pr-11"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#555570] hover:text-[#8888aa] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <a href="/forgot-password" className="text-sm text-purple-400 hover:text-purple-300 transition-colors">
                Forgot password?
              </a>
            </div>

            <button
              id="login-submit"
              type="submit"
              className="btn-primary w-full justify-center btn-lg"
              disabled={loading}
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</>
              ) : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
