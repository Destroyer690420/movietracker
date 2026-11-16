import { createContext, useContext } from 'react';

/**
 * The auth context lives in its own module so that `AuthContext.jsx` can
 * export nothing but a component (Fast Refresh friendly).
 */
export const AuthContext = createContext(null);

/**
 * Read the current user and the auth helpers.
 * @returns {{user: object|null, loading: boolean, signInWithGoogle: Function, signOut: Function}}
 */
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
