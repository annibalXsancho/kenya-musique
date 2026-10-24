import { useState } from 'react';
import { Button, Field, Segmented, Select } from '@core/ui';
import { addFichier, openFichier } from '@core/sync/files';
import type { CreateInput, Session } from '@core/model';
import s from '../Journal.module.css';

type Data = CreateInput<'sessions'>;

interface Props {
  initial?: Session;
  defaults: { date: string; dureeMin: number; type: string; intention: string; sprintId?: string };
  types: string[];
  sprints: { id: string; label: string }[];
  onSubmit: (data: Data) => void;
  onDelete?: () => void;
}

const lines = (t: string) =>
  t
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

function parseLivrables(text: string): NonNullable<Data['livrables']> {
  return lines(text).map((l) => {
    const [a, b] = l.split('|').map((x) => x.trim());
    const url = b ?? (/^https?:\/\//.test(a) ? a : undefined);
    const label = b ? a : url ? new URL(url).hostname : a;
    return url ? { label, url } : { label };
  });
}

const formatLivrables = (l: Session['livrables']) =>
  l
    .filter((x) => !x.fichier)
    .map((x) => (x.url ? `${x.label} | ${x.url}` : x.label))
    .join('\n');

export function SessionForm({ initial, defaults, types, sprints, onSubmit, onDelete }: Props) {
  const [date, setDate] = useState(initial?.date ?? defaults.date);
  const [duree, setDuree] = useState(String(initial?.dureeMin ?? defaults.dureeMin));
  const [type, setType] = useState(initial?.type ?? defaults.type);
  const [intention, setIntention] = useState(initial?.intention ?? defaults.intention);
  const [atteinte, setAtteinte] = useState(initial?.conditionAtteinte ?? true);
  const [sprintId, setSprintId] = useState(initial?.sprintId ?? defaults.sprintId ?? '');
  const [plus, setPlus] = useState(initial?.plus.join('\n') ?? '');
  const [moins, setMoins] = useState(initial?.moins.join('\n') ?? '');
  const [livrables, setLivrables] = useState(initial ? formatLivrables(initial.livrables) : '');
  const [fichiers, setFichiers] = useState(
    (initial?.livrables ?? [])
      .filter((l) => l.fichier)
      .map((l) => ({ id: l.fichier!, name: l.label })),
  );
  const [fileError, setFileError] = useState('');
  const [note, setNote] = useState(initial?.note ?? '');

  const dureeMin = Number(duree);
  const valid = Number.isInteger(dureeMin) && dureeMin > 0 && date !== '' && type !== '';
  const typeOptions = (types.includes(type) ? types : [...types, type]).map((t) => ({
    value: t,
    label: t,
  }));

  async function attach(files: FileList | null) {
    setFileError('');
    for (const f of Array.from(files ?? [])) {
      try {
        const added = await addFichier(f);
        setFichiers((prev) => [...prev, added]);
      } catch (e) {
        setFileError(e instanceof Error ? e.message : 'Ajout impossible.');
      }
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    onSubmit({
      date,
      dureeMin,
      type,
      intention: intention.trim(),
      conditionAtteinte: atteinte,
      sprintId: sprintId || undefined,
      plus: lines(plus),
      moins: lines(moins),
      livrables: [
        ...parseLivrables(livrables),
        ...fichiers.map((f) => ({ label: f.name, fichier: f.id })),
      ],
      note: note.trim(),
    });
  }

  return (
    <form className={s.form} onSubmit={submit}>
      <Field
        label="Intention"
        placeholder="Ce que je voulais travailler"
        value={intention}
        onChange={(e) => setIntention(e.target.value)}
        autoFocus={!initial}
        onFocus={(e) => !initial && e.target.select()}
      />
      <div className={s.two}>
        <Field
          label="Durée (min)"
          type="number"
          inputMode="numeric"
          min={1}
          value={duree}
          onChange={(e) => setDuree(e.target.value)}
        />
        <Field label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <Select
        label="Type"
        value={type}
        onChange={(e) => setType(e.target.value)}
        options={typeOptions}
      />
      <div>
        <div className={s.legend}>Condition de sortie atteinte</div>
        <Segmented
          label="Condition de sortie atteinte"
          value={atteinte ? 'oui' : 'non'}
          onChange={(v) => setAtteinte(v === 'oui')}
          options={[
            { value: 'oui', label: 'Oui' },
            { value: 'non', label: 'Non' },
          ]}
        />
      </div>
      <details className={s.details} open={Boolean(initial)}>
        <summary>Plus de détails</summary>
        <div className={s.form}>
          {sprints.length > 0 && (
            <Select
              label="Sprint"
              value={sprintId}
              onChange={(e) => setSprintId(e.target.value)}
              options={[
                { value: '', label: 'Aucun' },
                ...sprints.map((p) => ({ value: p.id, label: p.label })),
              ]}
            />
          )}
          <Field
            label="+ Ce qui a bien marché"
            multiline
            value={plus}
            onChange={(e) => setPlus(e.target.value)}
            hint="Une ligne par point"
          />
          <Field
            label="− Ce qui a coincé"
            multiline
            value={moins}
            onChange={(e) => setMoins(e.target.value)}
            hint="Une ligne par point"
          />
          <Field
            label="Livrables"
            multiline
            value={livrables}
            onChange={(e) => setLivrables(e.target.value)}
            hint="Un lien par ligne, ou « libellé | https://… »"
          />
          <div>
            <div className={s.legend}>Fichiers</div>
            {fichiers.map((f) => (
              <div key={f.id} className={s.file}>
                <button
                  type="button"
                  className={s.fileName}
                  onClick={() =>
                    openFichier(f.id, f.name).catch((e: Error) => setFileError(e.message))
                  }
                >
                  {f.name}
                </button>
                <button
                  type="button"
                  className={s.fileRemove}
                  aria-label={`Retirer ${f.name}`}
                  onClick={() => setFichiers((prev) => prev.filter((x) => x.id !== f.id))}
                >
                  ✕
                </button>
              </div>
            ))}
            <input
              type="file"
              multiple
              onChange={(e) => void attach(e.target.files)}
              className={s.fileInput}
            />
            {fileError && (
              <p role="alert" className={s.fileError}>
                {fileError}
              </p>
            )}
          </div>
          <Field label="Note" multiline value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      </details>
      <div className={s.actions}>
        <Button type="submit" disabled={!valid}>
          {initial ? 'Enregistrer' : 'Ajouter la session'}
        </Button>
        {onDelete && (
          <Button variant="ghost" onClick={onDelete}>
            Supprimer
          </Button>
        )}
      </div>
    </form>
  );
}
