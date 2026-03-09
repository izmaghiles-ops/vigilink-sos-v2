import { useEffect } from 'react';
import { SubscriptionPlan } from '../types';

interface PlanThemeTokens {
  background:           string;
  foreground:           string;
  card:                 string;
  cardForeground:       string;
  border:               string;
  input:                string;
  muted:                string;
  mutedForeground:      string;
  primary:              string;
  primaryForeground:    string;
  accent:               string;
  bodyBg:               string;
  bodyColor:            string;
  bodyBgImage:          string;
  navBg:                string;
  navBorder:            string;
}

const THEMES: Record<string, PlanThemeTokens> = {
  free: {
    background:        '214 25% 95%',
    foreground:        '215 35% 20%',
    card:              '0 0% 100%',
    cardForeground:    '215 35% 20%',
    border:            '214 20% 85%',
    input:             '214 20% 90%',
    muted:             '214 15% 90%',
    mutedForeground:   '215 15% 50%',
    primary:           '355 72% 45%',
    primaryForeground: '0 0% 100%',
    accent:            '215 45% 20%',
    bodyBg:            '#edf1f7',
    bodyColor:         '#1a2e4a',
    bodyBgImage:       'none',
    navBg:             'rgba(237,241,247,0.97)',
    navBorder:         'rgba(26,46,74,0.10)',
  },
  pro: {
    background:        '222 14% 11%',
    foreground:        '210 20% 92%',
    card:              '220 12% 14%',
    cardForeground:    '210 20% 92%',
    border:            '220 10% 24%',
    input:             '220 12% 17%',
    muted:             '220 12% 16%',
    mutedForeground:   '220 8% 58%',
    primary:           '217 80% 62%',
    primaryForeground: '0 0% 100%',
    accent:            '217 65% 52%',
    bodyBg:            '#141a24',
    bodyColor:         '#d4dff0',
    bodyBgImage:       'radial-gradient(ellipse 90% 60% at 50% 0%, rgba(80,120,220,0.10) 0%, transparent 70%)',
    navBg:             'rgba(14,18,28,0.97)',
    navBorder:         'rgba(120,160,255,0.15)',
  },
  platinum: {
    background:        '36 22% 8%',
    foreground:        '44 85% 88%',
    card:              '36 18% 11%',
    cardForeground:    '44 85% 88%',
    border:            '40 28% 22%',
    input:             '36 18% 14%',
    muted:             '36 18% 13%',
    mutedForeground:   '40 22% 52%',
    primary:           '43 92% 52%',
    primaryForeground: '36 22% 8%',
    accent:            '38 82% 46%',
    bodyBg:            '#130f05',
    bodyColor:         '#f0d080',
    bodyBgImage:       'radial-gradient(ellipse 90% 60% at 50% 0%, rgba(212,175,55,0.12) 0%, transparent 70%)',
    navBg:             'rgba(20,15,5,0.97)',
    navBorder:         'rgba(212,175,55,0.18)',
  },
};

function planToKey(plan: SubscriptionPlan): string {
  if (plan === 'platinum')                return 'platinum';
  if (plan === 'pro' || plan === 'trial') return 'pro';
  return 'free';
}

export function usePlanTheme(plan: SubscriptionPlan): void {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const key  = planToKey(plan);
    const t    = THEMES[key];

    html.style.setProperty('--background',          t.background);
    html.style.setProperty('--foreground',          t.foreground);
    html.style.setProperty('--card',                t.card);
    html.style.setProperty('--card-foreground',     t.cardForeground);
    html.style.setProperty('--border',              t.border);
    html.style.setProperty('--input',               t.input);
    html.style.setProperty('--muted',               t.muted);
    html.style.setProperty('--muted-foreground',    t.mutedForeground);
    html.style.setProperty('--primary',             t.primary);
    html.style.setProperty('--primary-foreground',  t.primaryForeground);
    html.style.setProperty('--accent',              t.accent);
    html.style.setProperty('--nav-bg',              t.navBg);
    html.style.setProperty('--nav-border',          t.navBorder);

    body.style.backgroundColor = t.bodyBg;
    body.style.color           = t.bodyColor;
    body.style.backgroundImage = t.bodyBgImage;
    body.style.transition      = 'background-color 0.5s ease, color 0.5s ease';

    html.classList.remove('theme-free', 'theme-pro', 'theme-platinum');
    html.classList.add(`theme-${key}`);

    return () => {
      html.style.removeProperty('--background');
      html.style.removeProperty('--foreground');
      html.style.removeProperty('--card');
      html.style.removeProperty('--card-foreground');
      html.style.removeProperty('--border');
      html.style.removeProperty('--input');
      html.style.removeProperty('--muted');
      html.style.removeProperty('--muted-foreground');
      html.style.removeProperty('--primary');
      html.style.removeProperty('--primary-foreground');
      html.style.removeProperty('--accent');
      html.style.removeProperty('--nav-bg');
      html.style.removeProperty('--nav-border');
      body.style.removeProperty('background-color');
      body.style.removeProperty('color');
      body.style.removeProperty('background-image');
      html.classList.remove('theme-free', 'theme-pro', 'theme-platinum');
    };
  }, [plan]);
}
