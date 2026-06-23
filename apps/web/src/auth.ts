import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

const API_BASE_URL = process.env.BUGSY_API_URL ?? "http://127.0.0.1:3333";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [Google],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account?.provider !== "google" || typeof profile?.sub !== "string") {
        return token;
      }

      const email = typeof profile.email === "string" ? profile.email : token.email;

      if (!email) {
        throw new Error("Google did not return an email address.");
      }

      token.bugsyUserId = await synchronizeGoogleUser({
        googleSubject: profile.sub,
        email,
        name: typeof profile.name === "string" ? profile.name : null,
        image: typeof profile.picture === "string" ? profile.picture : null,
      });

      return token;
    },
    session({ session, token }) {
      if (session.user && typeof token.bugsyUserId === "string") {
        session.user.id = token.bugsyUserId;
      }

      return session;
    },
  },
});

async function synchronizeGoogleUser(input: {
  googleSubject: string;
  email: string;
  name: string | null;
  image: string | null;
}) {
  if (!process.env.BUGSY_INTERNAL_API_KEY) {
    throw new Error("Missing BUGSY_INTERNAL_API_KEY.");
  }

  const response = await fetch(`${API_BASE_URL}/auth/google-user`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-bugsy-internal-key": process.env.BUGSY_INTERNAL_API_KEY,
    },
    body: JSON.stringify(input),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Bugsy user synchronization failed with status ${response.status}.`);
  }

  const body = (await response.json()) as {
    user?: {
      id?: string;
    };
  };

  if (!body.user?.id) {
    throw new Error("Bugsy user synchronization returned an invalid response.");
  }

  return body.user.id;
}
