// App mark: a cloud holding the budget gauge — same artwork as app/icon.svg.
const STAR = 'M0-4l1 3 3 1-3 1-1 3-1-3-3-1 3-1z';

export default function Logo() {
  return (
    <svg className="logo-mark" viewBox="0 0 64 64" width="1.4em" height="1.4em" aria-hidden="true">
      <defs>
        <linearGradient id="logo-mark-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e8f4ff" />
          <stop offset="1" stopColor="#cde6ff" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#logo-mark-bg)" />
      <path d="M19 47h27a10 10 0 0 0 1.5-19.9A14 14 0 0 0 20.6 24 11.5 11.5 0 0 0 19 47z" fill="#fff" stroke="#9cc4ea" strokeWidth="2" />
      <g fill="none" strokeLinecap="round" strokeWidth="4">
        <path d="M24 41a9 9 0 0 1 18 0" stroke="#d9e6f7" />
        <path d="M24 41a9 9 0 0 1 12.8-8.15" stroke="#3d5afe" />
      </g>
      <path d="M33 41l3.6-4.4" stroke="#3d5afe" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="33" cy="41" r="2.6" fill="#3d5afe" />
      <g fill="#ffb84d">
        <path d={STAR} transform="translate(51 13) scale(1.2)" />
        <path d={STAR} transform="translate(12 15) scale(.8)" />
      </g>
      <circle cx="14" cy="53" r="2" fill="#ff9aa8" />
    </svg>
  );
}
