// App mark: a budget gauge — the arc is the weekly quota, the needle today's spend.
export default function Logo() {
  return (
    <svg className="logo-mark" viewBox="0 0 24 24" width="1.4em" height="1.4em" aria-hidden="true">
      <rect width="24" height="24" rx="6" fill="var(--primary)" />
      <g fill="none" stroke="var(--primary-ink)" strokeLinecap="round" strokeWidth="2">
        <path d="M5.5 15.5a6.5 6.5 0 0 1 13 0" opacity=".35" />
        <path d="M5.5 15.5a6.5 6.5 0 0 1 9.75-5.63" />
        <path d="M12 15.5l2.6-3.9" />
      </g>
      <circle cx="12" cy="15.5" r="1.4" fill="var(--primary-ink)" />
    </svg>
  );
}
