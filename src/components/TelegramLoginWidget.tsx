import { useEffect, useRef } from 'react';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

interface Props {
  botId: string;
  onAuth: (user: TelegramUser) => void;
}

declare global {
  interface Window {
    TelegramLoginCallback?: (user: TelegramUser) => void;
  }
}

export default function TelegramLoginWidget({ botId, onAuth }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.TelegramLoginCallback = onAuth;

    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', botId);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-radius', '12');
    script.setAttribute('data-onauth', 'TelegramLoginCallback(user)');
    script.setAttribute('data-request-access', 'write');
    script.async = true;

    if (ref.current) {
      ref.current.innerHTML = '';
      ref.current.appendChild(script);
    }

    return () => {
      delete window.TelegramLoginCallback;
    };
  }, [botId, onAuth]);

  return <div ref={ref} style={{ display: 'flex', justifyContent: 'center' }} />;
}
