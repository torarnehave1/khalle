/** Khalle app logo: the same image as the favicon (favicons.vegvisr.org). */
export const APP_LOGO_URL = 'https://favicons.vegvisr.org/favicons/1794166468543-1-1794166471057-180x180.png';

export default function AppLogo({ className = 'w-10 h-10' }: { className?: string }) {
  return (
    <img
      src={APP_LOGO_URL}
      alt="Khalle"
      width={40}
      height={40}
      className={`${className} rounded-xl object-cover bg-white ring-2 ring-emerald-500/60 shadow-lg shadow-emerald-500/20 shrink-0`}
    />
  );
}
