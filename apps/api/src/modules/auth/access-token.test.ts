import { SignJWT } from "jose";
import { describe, expect, it } from "vitest";

import { createAccessTokenVerifier } from "./access-token.js";

const TOKEN_SECRET = "test-secret-with-at-least-32-characters";

describe("Bugsy access token", () => {
  it("accepts a valid token with the required scope", async () => {
    const verifier = createAccessTokenVerifier({
      BUGSY_TOKEN_SECRET: TOKEN_SECRET,
    });
    const token = await createToken({
      subject: "user-a",
      scope: "recordings:read recordings:write",
    });

    await expect(verifier(token, "recordings:write")).resolves.toBe("user-a");
  });

  it("rejects a token without the required scope", async () => {
    const verifier = createAccessTokenVerifier({
      BUGSY_TOKEN_SECRET: TOKEN_SECRET,
    });
    const token = await createToken({
      subject: "user-a",
      scope: "recordings:read",
    });

    await expect(verifier(token, "recordings:write")).resolves.toBeNull();
  });

  it("rejects a token signed with another secret", async () => {
    const verifier = createAccessTokenVerifier({
      BUGSY_TOKEN_SECRET: TOKEN_SECRET,
    });
    const token = await createToken({
      subject: "user-b",
      scope: "recordings:read",
      secret: "another-secret-with-at-least-32-characters",
    });

    await expect(verifier(token, "recordings:read")).resolves.toBeNull();
  });

  it("rejects an expired token", async () => {
    const verifier = createAccessTokenVerifier({
      BUGSY_TOKEN_SECRET: TOKEN_SECRET,
    });
    const token = await createToken({
      subject: "user-a",
      scope: "recordings:read",
      expirationTime: "0s",
    });

    await expect(verifier(token, "recordings:read")).resolves.toBeNull();
  });
});

async function createToken(options: {
  subject: string;
  scope: string;
  secret?: string;
  expirationTime?: string;
}) {
  return new SignJWT({
    scope: options.scope,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(options.subject)
    .setIssuer("bugsy-web")
    .setAudience("bugsy-api")
    .setIssuedAt()
    .setExpirationTime(options.expirationTime ?? "5m")
    .sign(new TextEncoder().encode(options.secret ?? TOKEN_SECRET));
}
