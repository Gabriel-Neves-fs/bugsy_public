import { jwtVerify } from "jose";

import "../../env.js";
import type { AccessTokenVerifier } from "./types.js";

const TOKEN_ISSUER = "bugsy-web";
const TOKEN_AUDIENCE = "bugsy-api";

export function createAccessTokenVerifier(env = process.env): AccessTokenVerifier {
  return async (token, requiredScope) => {
    if (!env.BUGSY_TOKEN_SECRET || !token) {
      return null;
    }

    try {
      const secret = new TextEncoder().encode(env.BUGSY_TOKEN_SECRET);
      const { payload } = await jwtVerify(token, secret, {
        issuer: TOKEN_ISSUER,
        audience: TOKEN_AUDIENCE,
      });
      const scopes = typeof payload.scope === "string" ? payload.scope.split(" ") : [];

      if (typeof payload.sub !== "string" || !scopes.includes(requiredScope)) {
        return null;
      }

      return payload.sub;
    } catch {
      return null;
    }
  };
}
