import type { IconName } from '../../modules';

const paths: Record<IconName | 'plus', React.ReactNode> = {
  home: <path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" />,
  planning: <path d="M4 7h10M4 12h16M4 17h7" />,
  agenda: (
    <>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M4 10h16M9 3v4M15 3v4" />
    </>
  ),
  journal: <path d="M6 4h11a1 1 0 0 1 1 1v15H7a1 1 0 0 1-1-1zM6 17h12M10 8h5" />,
  cap: <path d="M4 19V5M4 19h16M8 15l4-4 3 3 5-6" />,
  plus: <path d="M12 5v14M5 12h14" />,
};

export function Icon({ name, size = 22 }: { name: IconName | 'plus'; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
