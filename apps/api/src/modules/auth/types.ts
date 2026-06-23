export type GoogleUserInput = {
  googleSubject: string;
  email: string;
  name: string | null;
  image: string | null;
};

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
};

export type UserRepository = {
  upsertGoogleUser(input: GoogleUserInput): Promise<AuthUser>;
};

export type AccessTokenVerifier = (token: string, requiredScope: string) => Promise<string | null>;
