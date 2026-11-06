'use client';

// PATH: apps/web/src/app/(dashboard)/dashboard/profile/page.js

import { useState, useRef } from 'react';
import { Camera, Save } from 'lucide-react';
import useAuthStore from '@/stores/authStore';
import { getInitials } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { user, updateProfile, uploadAvatar } = useAuthStore();
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '' });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Name is required');
    setSaving(true);
    const r = await updateProfile({ name: form.name.trim() });
    setSaving(false);
    if (r.success) toast.success('Profile updated!');
    else toast.error(r.error);
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return toast.error('Max file size is 2MB');
    setUploading(true);
    const r = await uploadAvatar(file);
    setUploading(false);
    if (r.success) toast.success('Avatar updated!');
    else toast.error(r.error);
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">Profile</h2>
        <p className="page-sub">Manage your personal account settings</p>
      </div>

      <div className="profile-card">
        {/* Avatar section */}
        <div className="avatar-section">
          <div className="avatar-wrap">
            <div className="avatar">
              {user?.avatar
                ? <img src={user.avatar} alt={user.name} className="avatar-img" />
                : <span>{getInitials(user?.name || '')}</span>
              }
              {uploading && <div className="avatar-overlay"><div className="spinner" /></div>}
            </div>
            <button className="avatar-btn" onClick={() => fileRef.current?.click()} disabled={uploading}>
              <Camera size={14} />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAvatarChange}
              style={{ display: 'none' }}
            />
          </div>
          <div>
            <p className="avatar-name">{user?.name}</p>
            <p className="avatar-hint">JPG, PNG or WebP · Max 2MB</p>
          </div>
        </div>

        <div className="divider" />

        {/* Form */}
        <form onSubmit={handleSave} className="profile-form">
          <div className="field">
            <label className="label">Full name</label>
            <input
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="input"
              placeholder="Your name"
            />
          </div>
          <div className="field">
            <label className="label">Email address</label>
            <input
              value={form.email}
              disabled
              className="input input--disabled"
              placeholder="Email"
            />
            <span className="field-hint">Email cannot be changed</span>
          </div>
          <div className="form-footer">
            <button type="submit" className="btn-primary" disabled={saving}>
              <Save size={14} /> {saving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        .page { display: flex; flex-direction: column; gap: 24px; max-width: 560px; }
        .page-header { }
        .page-title { font-size: 22px; font-weight: 700; color: var(--c-text); letter-spacing: -0.4px; margin: 0 0 4px; }
        .page-sub { font-size: 14px; color: var(--c-text-3); margin: 0; }
        .profile-card { background: var(--c-surface); border: 1px solid var(--c-border); border-radius: 14px; padding: 28px; }
        .avatar-section { display: flex; align-items: center; gap: 20px; }
        .avatar-wrap { position: relative; }
        .avatar {
          width: 72px; height: 72px; border-radius: 50%; background: #4f46e5;
          display: flex; align-items: center; justify-content: center;
          font-size: 24px; font-weight: 700; color: #fff; overflow: hidden;
          border: 3px solid var(--c-surface); box-shadow: 0 0 0 2px var(--c-border);
        }
        .avatar-img { width: 100%; height: 100%; object-fit: cover; }
        .avatar-overlay {
          position: absolute; inset: 0; border-radius: 50%;
          background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center;
        }
        .spinner {
          width: 20px; height: 20px; border: 2px solid rgba(255,255,255,0.4);
          border-top-color: var(--c-surface); border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .avatar-btn {
          position: absolute; bottom: 0; right: 0;
          width: 26px; height: 26px; border-radius: 50%;
          background: #4f46e5; color: #fff; border: 2px solid var(--c-surface);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: background 0.15s;
        }
        .avatar-btn:hover:not(:disabled) { background: #4338ca; }
        .avatar-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .avatar-name { font-size: 16px; font-weight: 600; color: var(--c-text); margin: 0 0 4px; }
        .avatar-hint { font-size: 12px; color: var(--c-text-4); margin: 0; }
        .divider { height: 1px; background: var(--c-surface-2); margin: 24px 0; }
        .profile-form { display: flex; flex-direction: column; gap: 16px; }
        .field { display: flex; flex-direction: column; gap: 6px; }
        .label { font-size: 13px; font-weight: 500; color: var(--c-text-2); }
        .input {
          height: 42px; padding: 0 14px; font-size: 14px;
          border: 1px solid var(--c-border-2); border-radius: 9px; outline: none;
          font-family: var(--font-sans); color: var(--c-text); background: var(--c-surface);
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .input:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
        .input--disabled { background: var(--c-bg); color: var(--c-text-4); cursor: not-allowed; }
        .field-hint { font-size: 12px; color: var(--c-text-4); }
        .form-footer { display: flex; justify-content: flex-end; padding-top: 4px; }
        .btn-primary {
          display: flex; align-items: center; gap: 7px; padding: 10px 20px;
          background: #4f46e5; color: #fff; border: none; border-radius: 9px;
          font-size: 14px; font-weight: 600; cursor: pointer; font-family: var(--font-sans);
          transition: background 0.15s;
        }
        .btn-primary:hover:not(:disabled) { background: #4338ca; }
        .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
      `}</style>
    </div>
  );
}