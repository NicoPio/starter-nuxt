import { createAuthClient } from "better-auth/vue";

export const authClient = createAuthClient({
  baseURL: typeof window !== 'undefined'
    ? window.location.origin
    : "http://localhost:3000",
});

export const { useSession, signIn, signOut, signUp } = authClient;
