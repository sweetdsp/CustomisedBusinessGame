import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  icon?: string;
  primary?: boolean;
  disabledReason?: string; // when set the button is dimmed (not hidden) and shows why
  onClick?: () => void;
}

export default function Button({ children, icon, primary, disabledReason, onClick }: Props) {
  return (
    <div className="btn-wrap">
      <button className={`btn ${primary ? 'btn--glow' : ''}`} disabled={!!disabledReason} onClick={onClick}>
        {icon && <span aria-hidden>{icon} </span>}{children}
      </button>
      {disabledReason && <small className="btn-reason">{disabledReason}</small>}
    </div>
  );
}
