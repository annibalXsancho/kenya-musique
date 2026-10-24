import s from './SyncIndicator.module.css';

export type SyncState =
  { status: 'synced' } | { status: 'pending'; count: number } | { status: 'offline' };

export function SyncIndicator({ state }: { state: SyncState }) {
  const text =
    state.status === 'synced'
      ? 'Synchronisé'
      : state.status === 'pending'
        ? `En attente (${state.count})`
        : 'Hors ligne';
  return (
    <span className={s.root} role="status">
      <span className={`${s.dot} ${s[state.status]}`} aria-hidden="true" />
      {text}
    </span>
  );
}
