import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { useMediaQuery } from '../../lib/useMediaQuery';
import s from './Sheet.module.css';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

/** Panneau latéral (desktop ≥ 768 px) ou feuille du bas (mobile). */
export function Sheet({ open, onClose, title, children }: Props) {
  const desktop = useMediaQuery('(min-width: 768px)');
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const hidden = desktop ? { x: '100%' } : { y: '100%' };
  const shown = desktop ? { x: 0 } : { y: 0 };

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence>
        {open && (
          <div className={s.root}>
            <motion.div
              className={s.scrim}
              onClick={onClose}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            />
            <motion.div
              ref={panel}
              className={desktop ? s.side : s.bottom}
              role="dialog"
              aria-modal="true"
              aria-label={title}
              tabIndex={-1}
              initial={hidden}
              animate={shown}
              exit={hidden}
              transition={{ duration: 0.35, ease: [0.22, 0.61, 0.36, 1] }}
            >
              <header className={s.header}>
                <h3>{title}</h3>
                <button type="button" className={s.close} onClick={onClose} aria-label="Fermer">
                  ✕
                </button>
              </header>
              <div className={s.body}>{children}</div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </MotionConfig>
  );
}
