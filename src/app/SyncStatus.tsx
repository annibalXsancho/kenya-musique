import { useState } from 'react';
import { Button, Sheet, SyncIndicator } from '@core/ui';
import { logout, useAccount } from '@core/auth/client';
import { downloadExport } from '@core/db/export';
import { syncNow, useSyncStatus } from '@core/sync/manager';
import s from './SyncStatus.module.css';

/** Indicateur discret de synchro ; un clic ouvre le compte (synchroniser, se déconnecter). */
export function SyncStatus() {
  const { status, pending, phase, lastSyncAt } = useSyncStatus();
  const account = useAccount();
  const [open, setOpen] = useState(false);
  const state = status === 'pending' ? { status, count: pending } : ({ status } as const);

  return (
    <>
      <button
        type="button"
        className={s.button}
        onClick={() => setOpen(true)}
        aria-label="Compte et synchronisation"
      >
        <SyncIndicator state={state} />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Compte">
        <div className={s.body}>
          <p>Données dans le dépôt privé {account?.repo}</p>
          <p>
            {lastSyncAt
              ? `Dernière synchro : ${new Date(lastSyncAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
              : 'Pas encore synchronisé sur cet appareil.'}
            {pending > 0 && ` ${pending} élément(s) en attente d’envoi.`}
            {phase === 'error' && ' Une erreur a empêché l’envoi de certains éléments.'}
          </p>
          <Button variant="secondary" onClick={() => void syncNow()} disabled={phase === 'syncing'}>
            {phase === 'syncing' ? 'Synchronisation…' : 'Synchroniser maintenant'}
          </Button>
          <Button variant="secondary" onClick={() => void downloadExport()}>
            Exporter tout (JSON)
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setOpen(false);
              logout();
            }}
          >
            Se déconnecter
          </Button>
        </div>
      </Sheet>
    </>
  );
}
