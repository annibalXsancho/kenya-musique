import { useState } from 'react';
import { Button, Field } from '@core/ui';
import { getNotice, login } from '@core/auth/client';
import s from './LoginPage.module.css';

export function LoginPage() {
  const [repo, setRepo] = useState('');
  const [token, setToken] = useState('');
  const [error, setError] = useState(getNotice());
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(repo, token);
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
        <p>
          Tes données vivent dans un dépôt GitHub <strong>privé</strong>. Crée un jeton{' '}
          <a
            href="https://github.com/settings/personal-access-tokens/new"
            target="_blank"
            rel="noreferrer"
          >
            fine-grained
          </a>{' '}
          limité à ce dépôt, avec « Contents : Read and write ».
        </p>
        <form className={s.form} onSubmit={submit}>
          <Field
            label="Dépôt de données"
            placeholder="ton-pseudo/outil-data"
            value={repo}
            onChange={(e) => setRepo(e.target.value)}
            autoFocus
            autoCapitalize="none"
            autoCorrect="off"
          />
          <Field
            label="Jeton d’accès"
            type="password"
            autoComplete="off"
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
          {error && (
            <p role="alert" className={s.error}>
              {error}
            </p>
          )}
          <Button type="submit" disabled={busy || !repo || !token}>
            {busy ? 'Vérification…' : 'Se connecter'}
          </Button>
        </form>
      </div>
    </main>
  );
}
