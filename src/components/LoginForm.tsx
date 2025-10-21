'use client';

import { useState, useEffect } from 'react';
import { User } from '@/types';

interface LoginFormProps { onLogin: (user: User) => void; }

export default function LoginForm({ onLogin }: LoginFormProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'login'|'register'>('login');
  const [error, setError] = useState('');
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
  const endpoint = mode === 'login' ? '/api/users' : '/api/users/register';
  const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        onLogin(data.user);
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('Network error, please try again');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Username
        </label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="input-field w-full"
          placeholder="Enter username"
          required
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input-field w-full"
          placeholder="Enter password"
          required
        />
      </div>
      
      {error && (
        <div className="bg-red-600 text-white p-3 rounded-lg text-sm">
          {error}
        </div>
      )}
      
      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full text-lg py-3 mt-6 disabled:opacity-50"
      >
        {loading ? (mode==='login'?'Logging in...':'Registering...') : (mode==='login'?'Login Game':'Register and Login')}
      </button>
      <div className="text-center text-xs text-gray-400 mt-2">
        {mode==='login' ? (
          <span>No account? <button type="button" onClick={()=> setMode('register')} className="text-blue-400 hover:underline">Register</button></span>
        ) : (
          <span>Have an account? <button type="button" onClick={()=> setMode('login')} className="text-blue-400 hover:underline">Login</button></span>
        )}
      </div>
    </form>
  );
}
