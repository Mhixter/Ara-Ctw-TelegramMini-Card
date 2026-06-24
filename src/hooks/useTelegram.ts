import { useEffect, useState } from 'react';

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initData: string;
        initDataUnsafe: {
          user?: { id: number; username?: string; first_name?: string; last_name?: string; photo_url?: string };
        };
        themeParams: {
          bg_color?: string;
          text_color?: string;
          hint_color?: string;
          link_color?: string;
          button_color?: string;
          button_text_color?: string;
          secondary_bg_color?: string;
        };
        colorScheme: 'light' | 'dark';
        isExpanded: boolean;
        ready: () => void;
        expand: () => void;
        close: () => void;
        HapticFeedback: {
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
          selectionChanged: () => void;
        };
        BackButton: {
          show: () => void;
          hide: () => void;
          onClick: (cb: () => void) => void;
          offClick: (cb: () => void) => void;
        };
        MainButton: {
          show: () => void;
          hide: () => void;
          setText: (text: string) => void;
          onClick: (cb: () => void) => void;
        };
        onEvent: (event: string, cb: () => void) => void;
        offEvent: (event: string, cb: () => void) => void;
      };
    };
  }
}

export function useTelegram() {
  const tg = window.Telegram?.WebApp;
  const user = tg?.initDataUnsafe?.user;

  useEffect(() => {
    if (tg) {
      tg.ready();
      tg.expand();
      const theme = tg.themeParams;
      if (theme.bg_color) document.documentElement.style.setProperty('--tg-theme-bg-color', theme.bg_color);
      if (theme.text_color) document.documentElement.style.setProperty('--tg-theme-text-color', theme.text_color);
      if (theme.hint_color) document.documentElement.style.setProperty('--tg-theme-hint-color', theme.hint_color);
      if (theme.button_color) document.documentElement.style.setProperty('--tg-theme-button-color', theme.button_color);
      if (theme.secondary_bg_color) document.documentElement.style.setProperty('--tg-theme-secondary-bg-color', theme.secondary_bg_color);
    }
  }, []);

  function haptic(type: 'error' | 'success' | 'warning' = 'success') {
    tg?.HapticFeedback?.notificationOccurred(type);
  }

  function impact(style: 'light' | 'medium' | 'heavy' = 'light') {
    tg?.HapticFeedback?.impactOccurred(style);
  }

  return {
    tg,
    user,
    telegramId: user?.id,
    username: user?.username,
    firstName: user?.first_name,
    photoUrl: user?.photo_url,
    initData: tg?.initData || '',
    isDarkMode: tg?.colorScheme !== 'light',
    haptic,
    impact,
    isInTelegram: !!tg
  };
}
