import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { authApi } from '../services/api';
import toast from 'react-hot-toast';

// Types
interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'manager' | 'member';
  department?: string;
  position?: string;
  phone?: string;
  avatar_url?: string;
  is_active: boolean;
  organizations: Array<{
    organization_id: string;
    role: string;
    joined_at: string;
    organizations: {
      id: string;
      name: string;
      description?: string;
      industry?: string;
      logo_url?: string;
    };
  }>;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => Promise<void>;
  refreshUser: () => Promise<void>;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  department?: string;
  position?: string;
  organizationId?: string;
}

// Actions
type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_USER'; payload: { user: User; token: string } }
  | { type: 'CLEAR_USER' }
  | { type: 'UPDATE_USER'; payload: Partial<User> };

// Initial state
const initialState: AuthState = {
  user: null,
  token: localStorage.getItem('token'),
  isLoading: true,
  isAuthenticated: false,
};

// Reducer
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_USER':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isLoading: false,
        isAuthenticated: true,
      };
    case 'CLEAR_USER':
      return {
        ...state,
        user: null,
        token: null,
        isLoading: false,
        isAuthenticated: false,
      };
    case 'UPDATE_USER':
      return {
        ...state,
        user: state.user ? { ...state.user, ...action.payload } : null,
      };
    default:
      return state;
  }
};

// Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('token');
      
      if (token) {
        try {
          // Set token in axios defaults
          authApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          // Verify token and get user data
          const response = await authApi.get('/auth/me');
          dispatch({
            type: 'SET_USER',
            payload: {
              user: response.data.user,
              token,
            },
          });
        } catch (error) {
          console.error('Token verification failed:', error);
          localStorage.removeItem('token');
          delete authApi.defaults.headers.common['Authorization'];
          dispatch({ type: 'CLEAR_USER' });
        }
      } else {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const response = await authApi.post('/auth/login', {
        email,
        password,
      });

      const { token, user } = response.data;
      
      // Store token
      localStorage.setItem('token', token);
      authApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      dispatch({
        type: 'SET_USER',
        payload: { user, token },
      });
      
      toast.success(`Welcome back, ${user.first_name}!`);
    } catch (error: any) {
      dispatch({ type: 'SET_LOADING', payload: false });
      const message = error.response?.data?.error || 'Login failed';
      toast.error(message);
      throw error;
    }
  };

  const register = async (userData: RegisterData) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const response = await authApi.post('/auth/register', userData);
      
      const { token, user } = response.data;
      
      // Store token
      localStorage.setItem('token', token);
      authApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      dispatch({
        type: 'SET_USER',
        payload: { user, token },
      });
      
      toast.success(`Welcome to Hub Dashboard, ${user.first_name}!`);
    } catch (error: any) {
      dispatch({ type: 'SET_LOADING', payload: false });
      const message = error.response?.data?.error || 'Registration failed';
      toast.error(message);
      throw error;
    }
  };

  const logout = () => {
    // Clear token
    localStorage.removeItem('token');
    delete authApi.defaults.headers.common['Authorization'];
    
    // Clear state
    dispatch({ type: 'CLEAR_USER' });
    
    toast.success('Logged out successfully');
  };

  const updateProfile = async (data: Partial<User>) => {
    try {
      const response = await authApi.put('/auth/profile', data);
      
      dispatch({
        type: 'UPDATE_USER',
        payload: response.data.user,
      });
      
      toast.success('Profile updated successfully');
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to update profile';
      toast.error(message);
      throw error;
    }
  };

  const refreshUser = async () => {
    try {
      const response = await authApi.get('/auth/me');
      dispatch({
        type: 'UPDATE_USER',
        payload: response.data.user,
      });
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    updateProfile,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
