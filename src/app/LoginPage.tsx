import { useState } from 'react';
import { Button, Field } from '@core/ui';
import { login } from '@core/auth/client';
import s from './LoginPage.module.css';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connexion impossible.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={s.wrap}>
      <div className={s.card}>
        <h1 className={s.title}>Outil</h1>
        <p>Connecte-toi pour synchroniser tes appareils.</p>
        <form className={s.form} onSubmit={submit}>
          <Field
            label="E-mail"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
          />
          <Field
            label="Mot de passe"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && (
            <p role="alert" className={s.error}>
              {error}
            </p>
          )}
          <Button type="submit" disabled={busy || !email || !password}>
            {busy ? 'Connexion…' : 'Se connecter'}
          </Button>
        </form>
      </div>
    </main>
  );
}
