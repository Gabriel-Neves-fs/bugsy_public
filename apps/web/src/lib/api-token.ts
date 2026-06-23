import { SignJWT } from "jose";

const TOKEN_ISSUER = "bugsy-web";
const TOKEN_AUDIENCE = "bugsy-api";

export async function createApiToken(userId: string, scopes: string[]) {
  if (!process.env.BUGSY_TOKEN_SECRET) {
    throw new Error("Missing BUGSY_TOKEN_SECRET.");
  }

  const secret = new TextEncoder().encode(process.env.BUGSY_TOKEN_SECRET);

  return new SignJWT({
    scope: scopes.join(" "),
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(userId)
    .setIssuer(TOKEN_ISSUER)
    .setAudience(TOKEN_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(secret);
}
