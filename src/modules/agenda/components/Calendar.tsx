import { forwardRef, useImperativeHandle, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import frLocale from '@fullcalendar/core/locales/fr';
import type { CalendarOptions, EventInput } from '@fullcalendar/core';
import { toLocalDT } from '@core/lib/dates';
import s from '../Agenda.module.css';

export type ViewName = 'timeGridDay' | 'timeGrid3Day' | 'timeGridWeek';

export interface RangeInfo {
  start: string;
  end: string;
  title: string;
}

export interface DropPayload {
  titre: string;
  intention?: string;
  sprintId?: string;
  etapeId?: string;
}

export interface CalendarHandle {
  prev(): void;
  next(): void;
  today(): void;
  setView(v: ViewName): void;
}

interface Props {
  events: EventInput[];
  initialView: ViewName;
  onRange: (r: RangeInfo) => void;
  onMove: (id: string, debut: string, fin: string) => void;
  onSelect: (debut: string, fin: string) => void;
  onOpen: (id: string) => void;
  onDropExternal: (p: DropPayload, debut: string, fin: string) => void;
}

type Opt<K extends keyof CalendarOptions> = CalendarOptions[K] extends
  ((arg: infer A) => unknown) | undefined
  ? A
  : never;

const pad = (n: number) => String(n).padStart(2, '0');

/** Grille FullCalendar : tout le style est dans Agenda.module.css (voir `.cal :global(...)`). */
export const Calendar = forwardRef<CalendarHandle, Props>(function Calendar(
  { events, initialView, onRange, onMove, onSelect, onOpen, onDropExternal },
  ref,
) {
  const cal = useRef<FullCalendar>(null);
  useImperativeHandle(ref, () => ({
    prev: () => cal.current?.getApi().prev(),
    next: () => cal.current?.getApi().next(),
    today: () => cal.current?.getApi().today(),
    setView: (v) => cal.current?.getApi().changeView(v),
  }));

  const scrollFrom = new Date(Date.now() - 60 * 60 * 1000);
  const scrollTime = `${pad(Math.min(Math.max(scrollFrom.getHours(), 7), 20))}:00:00`;

  return (
    <FullCalendar
      ref={cal}
      plugins={[timeGridPlugin, interactionPlugin]}
      locale={frLocale}
      initialView={initialView}
      views={{ timeGrid3Day: { type: 'timeGrid', duration: { days: 3 } } }}
      headerToolbar={false}
      firstDay={1}
      allDaySlot={false}
      slotMinTime="07:00:00"
      slotMaxTime="24:00:00"
      slotDuration="00:30:00"
      snapDuration="00:15:00"
      slotLabelInterval="01:00"
      slotLabelFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
      scrollTime={scrollTime}
      scrollTimeReset={false}
      nowIndicator
      height="100%"
      expandRows
      editable
      eventStartEditable
      eventDurationEditable
      selectable
      selectMirror
      longPressDelay={320}
      eventLongPressDelay={320}
      selectLongPressDelay={320}
      droppable
      events={events}
      dayHeaderContent={(a) => (
        <div className={a.isToday ? `${s.dh} ${s.dhToday}` : s.dh}>
          <span className={s.dhWeek}>
            {a.date.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '')}
          </span>
          <span className={s.dhNum}>{a.date.getDate()}</span>
        </div>
      )}
      eventContent={(a) => {
        const p = a.event.extendedProps;
        if (a.event.display === 'background')
          return <span className={s.unavailLabel}>{a.event.title}</span>;
        const mins =
          a.event.start && a.event.end
            ? (a.event.end.getTime() - a.event.start.getTime()) / 60000
            : 60;
        return (
          <div className={s.ev}>
            <div className={s.evTitle}>
              {p.statut === 'valide' && <span className={s.evCheck}>✓ </span>}
              {a.event.title || 'Séance'}
            </div>
            {mins >= 45 && <div className={s.evTime}>{a.timeText}</div>}
            {mins >= 80 && p.sprint && <div className={s.evMeta}>{p.sprint}</div>}
            {p.toValidate && <span className={s.evDot} aria-label="À valider" />}
          </div>
        );
      }}
      datesSet={(a) =>
        onRange({ start: toLocalDT(a.start), end: toLocalDT(a.end), title: a.view.title })
      }
      eventClick={(a: Opt<'eventClick'>) => a.event.display !== 'background' && onOpen(a.event.id)}
      eventDrop={(a: Opt<'eventDrop'>) =>
        a.event.start &&
        a.event.end &&
        onMove(a.event.id, toLocalDT(a.event.start), toLocalDT(a.event.end))
      }
      eventResize={(a: Opt<'eventResize'>) =>
        a.event.start &&
        a.event.end &&
        onMove(a.event.id, toLocalDT(a.event.start), toLocalDT(a.event.end))
      }
      select={(a: Opt<'select'>) => {
        onSelect(toLocalDT(a.start), toLocalDT(a.end));
        a.view.calendar.unselect();
      }}
      eventReceive={(a: Opt<'eventReceive'>) => {
        const { start, end } = a.event;
        const payload = a.event.extendedProps as DropPayload;
        a.event.remove(); // l'événement provisoire disparaît : la séance réelle arrive depuis la base
        if (start && end)
          onDropExternal({ ...payload, titre: a.event.title }, toLocalDT(start), toLocalDT(end));
      }}
    />
  );
});
