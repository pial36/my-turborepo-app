'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, ArrowRight, Layers } from 'lucide-react';
import useAuthStore from '@/stores/authStore';
import toast from 'react-hot-toast';
import useHydrated from '@/hooks/useHydrated';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();
  const hydrated = useHydrated();
               

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.email) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email';
    if (!form.password) e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const result = await login(form.email, form.password);
    if (result.success) {
      toast.success('Welcome back!');
      router.push('/dashboard');
    } else {
      toast.error(result.error);
    }
  };

  if (!hydrated) return null;

  return (
    <div className="auth-root">
      {/* Left panel — branding */}
      <div className="auth-left">
        <div className="auth-left-inner">
          <div className="auth-brand">
            <div className="auth-logo">
              <Layers size={22} strokeWidth={1.5} />
            </div>
            <span className="auth-logo-text">Team Hub</span>
          </div>

          <div className="auth-hero">
            <h1 className="auth-hero-title">
              Where teams<br />
              <em>move forward</em><br />
              together.
            </h1>
            <p className="auth-hero-sub">
              Manage goals, track progress, and keep your team aligned — all in one collaborative workspace.
            </p>
          </div>

          <div className="auth-stats">
            <div className="auth-stat">
              <span className="auth-stat-num">3</span>
              <span className="auth-stat-label">Demo accounts ready</span>
            </div>
            <div className="auth-stat-divider" />
            <div className="auth-stat">
              <span className="auth-stat-num">∞</span>
              <span className="auth-stat-label">Workspaces</span>
            </div>
            <div className="auth-stat-divider" />
            <div className="auth-stat">
              <span className="auth-stat-num">Live</span>
              <span className="auth-stat-label">Real-time sync</span>
            </div>
          </div>
        </div>

        {/* Decorative grid */}
        <div className="auth-grid-bg" aria-hidden="true">
          {Array.from({ length: 80 }).map((_, i) => (
            <div key={i} className="auth-grid-cell" />
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div className="auth-right">
        <div className="auth-form-wrap">
          <div className="auth-form-header">
            <h2 className="auth-form-title">Sign in</h2>
            <p className="auth-form-sub">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="auth-link">Create one</Link>
            </p>
          </div>

          {/* Demo credentials hint */}
          <div className="auth-demo-hint">
            <span className="auth-demo-label">Demo</span>
            <span className="auth-demo-creds">admin@demo.com · demo123456</span>
          </div>

          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            <div className="auth-field">
              <label className="auth-label" htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={`auth-input ${errors.email ? 'auth-input--error' : ''}`}
              />
              {errors.email && <span className="auth-error">{errors.email}</span>}
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="password">Password</label>
              <div className="auth-input-wrap">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className={`auth-input auth-input--icon ${errors.password ? 'auth-input--error' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="auth-eye"
                  tabIndex={-1}
                  aria-label="Toggle password"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <span className="auth-error">{errors.password}</span>}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="auth-submit"
            >
              {isLoading ? (
                <span className="auth-spinner" />
              ) : (
                <>
                  <span>Sign in</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      <style jsx>{`
        /* ── Root ── */
        .auth-root {
          display: flex;
          min-height: 100vh;
          background: #f8f9fb;
        }

        /* ── Left panel ── */
        .auth-left {
          position: relative;
          flex: 0 0 480px;
          background: #0f1117;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .auth-left-inner {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          height: 100%;
          padding: 48px;
        }

        .auth-brand {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .auth-logo {
          width: 38px;
          height: 38px;
          background: #4f46e5;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
        }

        .auth-logo-text {
          font-size: 17px;
          font-weight: 600;
          color: #fff;
          letter-spacing: -0.3px;
        }

        .auth-hero {
          margin-top: auto;
          padding-bottom: 48px;
        }

        .auth-hero-title {
          font-family: var(--font-display);
          font-size: 48px;
          font-weight: 400;
          line-height: 1.1;
          color: #fff;
          margin: 0 0 20px;
        }

        .auth-hero-title em {
          color: #818cf8;
          font-style: italic;
        }

        .auth-hero-sub {
          font-size: 15px;
          line-height: 1.6;
          color: #8b949e;
          max-width: 320px;
          margin: 0;
        }

        .auth-stats {
          display: flex;
          align-items: center;
          gap: 24px;
          padding-top: 32px;
          border-top: 1px solid rgba(255,255,255,0.08);
        }

        .auth-stat {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .auth-stat-num {
          font-size: 20px;
          font-weight: 700;
          color: #fff;
          letter-spacing: -0.5px;
        }

        .auth-stat-label {
          font-size: 11px;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .auth-stat-divider {
          width: 1px;
          height: 32px;
          background: rgba(255,255,255,0.08);
        }

        /* Decorative grid */
        .auth-grid-bg {
          position: absolute;
          inset: 0;
          display: grid;
          grid-template-columns: repeat(8, 1fr);
          grid-template-rows: repeat(10, 1fr);
          opacity: 0.04;
          pointer-events: none;
        }

        .auth-grid-cell {
          border: 0.5px solid #fff;
        }

        /* ── Right panel ── */
        .auth-right {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 48px 24px;
        }

        .auth-form-wrap {
          width: 100%;
          max-width: 400px;
        }

        .auth-form-header {
          margin-bottom: 28px;
        }

        .auth-form-title {
          font-size: 26px;
          font-weight: 700;
          color: #101828;
          letter-spacing: -0.5px;
          margin: 0 0 6px;
        }

        .auth-form-sub {
          font-size: 14px;
          color: #6b7280;
          margin: 0;
        }

        .auth-link {
          color: #4f46e5;
          font-weight: 500;
          text-decoration: none;
        }

        .auth-link:hover {
          text-decoration: underline;
        }

        /* Demo hint */
        .auth-demo-hint {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #eef2ff;
          border: 1px solid #c7d2fe;
          border-radius: 8px;
          padding: 10px 14px;
          margin-bottom: 28px;
        }

        .auth-demo-label {
          font-size: 11px;
          font-weight: 700;
          color: #4f46e5;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          background: #c7d2fe;
          padding: 2px 7px;
          border-radius: 4px;
          white-space: nowrap;
        }

        .auth-demo-creds {
          font-size: 13px;
          color: #4338ca;
          font-family: var(--font-mono, monospace);
        }

        /* Form */
        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .auth-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .auth-label {
          font-size: 13px;
          font-weight: 500;
          color: #374151;
        }

        .auth-input-wrap {
          position: relative;
        }

        .auth-input {
          width: 100%;
          height: 44px;
          padding: 0 14px;
          font-size: 14px;
          font-family: var(--font-sans);
          color: #101828;
          background: #fff;
          border: 1px solid #d1d5db;
          border-radius: 10px;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
          box-sizing: border-box;
        }

        .auth-input::placeholder {
          color: #9ca3af;
        }

        .auth-input:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.12);
        }

        .auth-input--error {
          border-color: #f04438;
        }

        .auth-input--error:focus {
          box-shadow: 0 0 0 3px rgba(240,68,56,0.12);
        }

        .auth-input--icon {
          padding-right: 44px;
        }

        .auth-eye {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: #9ca3af;
          display: flex;
          align-items: center;
          padding: 0;
          transition: color 0.15s;
        }

        .auth-eye:hover {
          color: #6366f1;
        }

        .auth-error {
          font-size: 12px;
          color: #f04438;
        }

        /* Submit */
        .auth-submit {
          height: 46px;
          background: #4f46e5;
          color: #fff;
          border: none;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          font-family: var(--font-sans);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: background 0.15s, transform 0.1s, box-shadow 0.15s;
          box-shadow: 0 1px 2px rgba(79,70,229,0.2);
          margin-top: 4px;
        }

        .auth-submit:hover:not(:disabled) {
          background: #4338ca;
          box-shadow: 0 4px 12px rgba(79,70,229,0.3);
          transform: translateY(-1px);
        }

        .auth-submit:active:not(:disabled) {
          transform: translateY(0);
        }

        .auth-submit:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        /* Spinner */
        .auth-spinner {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* ── Responsive ── */
        @media (max-width: 768px) {
          .auth-left {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}