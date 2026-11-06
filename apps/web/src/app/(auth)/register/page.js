'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, ArrowRight, Layers, Check } from 'lucide-react';
import useAuthStore from '@/stores/authStore';
import toast from 'react-hot-toast';

const PERKS = [
  'Multiple workspaces per account',
  'Real-time collaboration with your team',
  'Goal tracking with milestones',
  'Kanban & list view for action items',
];

export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading } = useAuthStore();

  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState({});

const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/

const validate = () => {
  const e = {}

  if (!form.name.trim()) {
    e.name = 'Name is required'
  }

  if (!form.email) {
    e.email = 'Email is required'
  } else if (!/\S+@\S+\.\S+/.test(form.email)) {
    e.email = 'Enter a valid email'
  }

  if (!form.password) {
    e.password = 'Password is required'
  } else if (!passwordRegex.test(form.password)) {
    e.password =
      'Password must be 8+ chars with uppercase, lowercase, number & special character'
  }

  if (!form.confirmPassword) {
    e.confirmPassword = 'Please confirm your password'
  } else if (form.password !== form.confirmPassword) {
    e.confirmPassword = 'Passwords do not match'
  }

  setErrors(e)
  return Object.keys(e).length === 0
}

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const { confirmPassword, ...data } = form;
    const result = await register(data.email, data.password, data.name);

    if (result.success) {
      toast.success('Account created! Welcome to Team Hub.');
      router.push('/dashboard');
    } else {
      toast.error(result.error);
    }
  };

  const field = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="auth-root">
      {/* Left panel */}
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
              Built for<br />
              teams that<br />
              <em>get things done.</em>
            </h1>
            <p className="auth-hero-sub">
              Join teams already using Team Hub to stay aligned and ship faster.
            </p>
          </div>

          <ul className="auth-perks">
            {PERKS.map((perk) => (
              <li key={perk} className="auth-perk">
                <span className="auth-perk-icon">
                  <Check size={13} strokeWidth={2.5} />
                </span>
                {perk}
              </li>
            ))}
          </ul>
        </div>

        <div className="auth-grid-bg" aria-hidden="true">
          {Array.from({ length: 80 }).map((_, i) => (
            <div key={i} className="auth-grid-cell" />
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="auth-right">
        <div className="auth-form-wrap">
          <div className="auth-form-header">
            <h2 className="auth-form-title">Create your account</h2>
            <p className="auth-form-sub">
              Already have one?{' '}
              <Link href="/login" className="auth-link">Sign in</Link>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            {/* Name */}
            <div className="auth-field">
              <label className="auth-label" htmlFor="name">Full name</label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                placeholder="Jane Smith"
                value={form.name}
                onChange={(e) => field('name', e.target.value)}
                className={`auth-input ${errors.name ? 'auth-input--error' : ''}`}
              />
              {errors.name && <span className="auth-error">{errors.name}</span>}
            </div>

            {/* Email */}
            <div className="auth-field">
              <label className="auth-label" htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                value={form.email}
                onChange={(e) => field('email', e.target.value)}
                className={`auth-input ${errors.email ? 'auth-input--error' : ''}`}
              />
              {errors.email && <span className="auth-error">{errors.email}</span>}
            </div>

            {/* Password */}
            <div className="auth-field">
              <label className="auth-label" htmlFor="password">Password</label>
              <div className="auth-input-wrap">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Minimum 8 characters"
                  value={form.password}
                  onChange={(e) => field('password', e.target.value)}
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

            {/* Confirm password */}
            <div className="auth-field">
              <label className="auth-label" htmlFor="confirmPassword">Confirm password</label>
              <div className="auth-input-wrap">
                <input
                  id="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={form.confirmPassword}
                  onChange={(e) => field('confirmPassword', e.target.value)}
                  className={`auth-input auth-input--icon ${errors.confirmPassword ? 'auth-input--error' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="auth-eye"
                  tabIndex={-1}
                  aria-label="Toggle confirm password"
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.confirmPassword && <span className="auth-error">{errors.confirmPassword}</span>}
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
                  <span>Create account</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            <p className="auth-terms">
              By creating an account you agree to our{' '}
              <span style={{ color: '#4f46e5' }}>Terms of Service</span>{' '}
              and{' '}
              <span style={{ color: '#4f46e5' }}>Privacy Policy</span>.
            </p>
          </form>
        </div>
      </div>

      <style jsx>{`
        .auth-root {
          display: flex;
          min-height: 100vh;
          background: var(--c-bg);
        }

        /* Left */
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
          padding-bottom: 36px;
        }

        .auth-hero-title {
          font-family: var(--font-display);
          font-size: 44px;
          font-weight: 400;
          line-height: 1.1;
          color: #fff;
          margin: 0 0 18px;
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

        .auth-perks {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .auth-perk {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13.5px;
          color: var(--c-text-4);
        }

        .auth-perk-icon {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: rgba(99,102,241,0.2);
          color: #818cf8;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

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
          border: 0.5px solid var(--c-surface);
        }

        /* Right */
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
          color: var(--c-text);
          letter-spacing: -0.5px;
          margin: 0 0 6px;
        }

        .auth-form-sub {
          font-size: 14px;
          color: var(--c-text-3);
          margin: 0;
        }

        :global(.auth-link) {
          color: #4f46e5;
          font-weight: 500;
          text-decoration: none;
        }

        :global(.auth-link:hover) {
          text-decoration: underline;
        }

        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .auth-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .auth-label {
          font-size: 13px;
          font-weight: 500;
          color: var(--c-text-2);
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
          color: var(--c-text);
          background: var(--c-surface);
          border: 1px solid var(--c-border-2);
          border-radius: 10px;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
          box-sizing: border-box;
        }

        .auth-input::placeholder {
          color: var(--c-text-4);
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
          color: var(--c-text-4);
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

        .auth-spinner {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: var(--c-surface);
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        .auth-terms {
          font-size: 12px;
          color: var(--c-text-4);
          text-align: center;
          margin: 0;
          line-height: 1.5;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .auth-left { display: none; }
        }
      `}</style>
    </div>
  );
}