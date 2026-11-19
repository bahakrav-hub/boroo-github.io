import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { hashPasswordWithSalt, generateSalt } from '../utils/crypto';
import { saveToStorage, loadFromStorage, STORAGE_KEYS } from '../utils/storage';

interface AuthState {
  isAuthenticated: boolean;
  username: string;
}

interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  changePassword: (oldPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const DEFAULT_USERNAME = 'admin';
const DEFAULT_PASSWORD = 'admin123';

interface StoredCredentials {
  username: string;
  passwordHash: string;
  salt: string;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    username: '',
  });

  useEffect(() => {
    const stored = loadFromStorage<StoredCredentials | null>(STORAGE_KEYS.AUTH, null);
    if (!stored) {
      const initCredentials = async () => {
        const salt = generateSalt();
        const passwordHash = await hashPasswordWithSalt(DEFAULT_PASSWORD, salt);
        const creds: StoredCredentials = {
          username: DEFAULT_USERNAME,
          passwordHash,
          salt,
        };
        saveToStorage(STORAGE_KEYS.AUTH, creds);
      };
      initCredentials();
    }
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const stored = loadFromStorage<StoredCredentials | null>(STORAGE_KEYS.AUTH, null);
    if (!stored) {
      return { success: false, error: 'Учётные данные не инициализированы' };
    }

    if (username !== stored.username) {
      return { success: false, error: 'Неверный логин или пароль' };
    }

    const isValidWithSalt = await hashPasswordWithSalt(password, stored.salt).then(
      hash => hash === stored.passwordHash
    );

    if (!isValidWithSalt) {
      return { success: false, error: 'Неверный логин или пароль' };
    }

    setAuthState({ isAuthenticated: true, username });
    return { success: true };
  }, []);

  const logout = useCallback(() => {
    setAuthState({ isAuthenticated: false, username: '' });
  }, []);

  const changePassword = useCallback(async (oldPassword: string, newPassword: string) => {
    const stored = loadFromStorage<StoredCredentials | null>(STORAGE_KEYS.AUTH, null);
    if (!stored) {
      return { success: false, error: 'Учётные данные не найдены' };
    }

    const isValidWithSalt = await hashPasswordWithSalt(oldPassword, stored.salt).then(
      hash => hash === stored.passwordHash
    );

    if (!isValidWithSalt) {
      return { success: false, error: 'Текущий пароль введён неверно' };
    }

    if (newPassword.length < 6) {
      return { success: false, error: 'Пароль должен быть не менее 6 символов' };
    }

    const newSalt = generateSalt();
    const newPasswordHash = await hashPasswordWithSalt(newPassword, newSalt);

    const newCreds: StoredCredentials = {
      username: stored.username,
      passwordHash: newPasswordHash,
      salt: newSalt,
    };

    saveToStorage(STORAGE_KEYS.AUTH, newCreds);
    return { success: true };
  }, []);

  return (
    <AuthContext.Provider value={{ ...authState, login, logout, changePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
