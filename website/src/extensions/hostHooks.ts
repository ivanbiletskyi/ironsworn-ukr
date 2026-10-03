// Хуки, які хост передає розширенням через HostApi.

import { useParams } from 'react-router-dom';
import { useAuth } from '../components/auth/authContext';
import type { HostUser, Lang } from './api';

export function useLang(): Lang {
  const { lang } = useParams();
  return lang === 'en' ? 'en' : 'uk';
}

export function useUser(): HostUser | null {
  const { user } = useAuth();
  return user ? { uid: user.uid, email: user.email } : null;
}
