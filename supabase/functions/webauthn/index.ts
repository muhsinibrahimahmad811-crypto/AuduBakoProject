import { createClient } from "npm:@supabase/supabase-js@2";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "jsr:@simplewebauthn/server@14.1.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const rpID = Deno.env.get("WEBAUTHN_RP_ID");
const expectedOrigins = (Deno.env.get("WEBAUTHN_ORIGINS") ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Supabase service configuration is missing.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders });

const readRequiredString = (value: unknown, name: string) => {
  if (typeof value !== "string" || value.length === 0) {
    throw new HttpError(400, `Missing ${name}.`);
  }
  return value;
};

const assertServerConfiguration = () => {
  if (!rpID || expectedOrigins.length === 0) {
    throw new HttpError(500, "WebAuthn server configuration is incomplete.");
  }
};

const getActiveAdmin = async (username: string, password?: string) => {
  let query = supabase
    .from("users")
    .select("id, username, name, department, role, is_admin, active")
    .eq("username", username);

  if (password !== undefined) query = query.eq("password", password);

  const { data: user, error } = await query.maybeSingle();
  if (error) throw new Error(`Could not load user: ${error.message}`);
  if (!user || user.active === false || !user.is_admin) {
    throw new HttpError(401, "Admin account could not be authenticated.");
  }
  return user;
};

const saveChallenge = async (
  username: string,
  purpose: string,
  challenge: string,
) => {
  const { error: cleanupError } = await supabase
    .from("webauthn_challenges")
    .delete()
    .lt("expires_at", new Date().toISOString());
  if (cleanupError) {
    throw new Error(
      `Could not clean expired challenges: ${cleanupError.message}`,
    );
  }

  const challengeId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  const { error } = await supabase.from("webauthn_challenges").insert({
    id: challengeId,
    username,
    purpose,
    challenge,
    expires_at: expiresAt,
  });
  if (error) {
    throw new Error(`Could not save WebAuthn challenge: ${error.message}`);
  }
  return challengeId;
};

const consumeChallenge = async (
  challengeId: string,
  username: string,
  purpose: string,
) => {
  const { data, error } = await supabase
    .from("webauthn_challenges")
    .delete()
    .eq("id", challengeId)
    .eq("username", username)
    .eq("purpose", purpose)
    .gt("expires_at", new Date().toISOString())
    .select("challenge")
    .maybeSingle();

  if (error) {
    throw new Error(`Could not consume WebAuthn challenge: ${error.message}`);
  }
  if (!data) {
    throw new HttpError(400, "WebAuthn challenge expired or already used.");
  }
  return data.challenge;
};

const handleRequest = async (body: Record<string, unknown>) => {
  assertServerConfiguration();

  const action = readRequiredString(body.action, "action");
  const username = readRequiredString(body.username, "username");

  if (action === "registration-options") {
    const password = readRequiredString(body.password, "password");
    const user = await getActiveAdmin(username, password);
    const { data: existingCredentials, error } = await supabase
      .from("webauthn_credentials")
      .select("credential_id, transports")
      .eq("username", username);
    if (error) {
      throw new Error(
        `Could not load registered credentials: ${error.message}`,
      );
    }

    const options = await generateRegistrationOptions({
      rpName: "Audu Bako Secretariat System",
      rpID: rpID!,
      userID: new TextEncoder().encode(String(user.id)),
      userName: user.username,
      userDisplayName: user.name,
      attestationType: "none",
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        residentKey: "preferred",
        userVerification: "required",
      },
      excludeCredentials: (existingCredentials ?? []).map((credential) => ({
        id: credential.credential_id,
        transports: credential.transports,
      })),
    });

    const challengeId = await saveChallenge(
      username,
      "registration",
      options.challenge,
    );
    return { challengeId, options };
  }

  if (action === "registration-verify") {
    const password = readRequiredString(body.password, "password");
    await getActiveAdmin(username, password);
    const challengeId = readRequiredString(body.challengeId, "challengeId");
    const credential = body.credential;
    if (!credential || typeof credential !== "object") {
      throw new HttpError(400, "Missing authenticator response.");
    }

    const expectedChallenge = await consumeChallenge(
      challengeId,
      username,
      "registration",
    );
    const verification = await verifyRegistrationResponse({
      response: credential as Parameters<
        typeof verifyRegistrationResponse
      >[0]["response"],
      expectedChallenge,
      expectedOrigin: expectedOrigins,
      expectedRPID: rpID!,
    });
    if (!verification.verified || !verification.registrationInfo) {
      throw new HttpError(
        400,
        "Authenticator registration could not be verified.",
      );
    }

    const { credential: registeredCredential } = verification.registrationInfo;
    const { error } = await supabase.from("webauthn_credentials").insert({
      credential_id: registeredCredential.id,
      username,
      public_key: encodeBase64Url(registeredCredential.publicKey),
      counter: registeredCredential.counter,
      transports: registeredCredential.transports ?? [],
    });
    if (error) {
      throw new Error(`Could not save authenticator: ${error.message}`);
    }
    return { verified: true };
  }

  if (action === "authentication-options") {
    await getActiveAdmin(username);
    const { data: credentials, error } = await supabase
      .from("webauthn_credentials")
      .select("credential_id, transports")
      .eq("username", username);
    if (error) {
      throw new Error(
        `Could not load registered credentials: ${error.message}`,
      );
    }
    if (!credentials?.length) {
      throw new HttpError(
        404,
        "No Face ID is registered. Log in with your password to set it up.",
      );
    }

    const options = await generateAuthenticationOptions({
      rpID: rpID!,
      allowCredentials: credentials.map((credential) => ({
        id: credential.credential_id,
        transports: credential.transports,
      })),
      userVerification: "required",
    });

    const challengeId = await saveChallenge(
      username,
      "authentication",
      options.challenge,
    );
    return { challengeId, options };
  }

  if (action === "authentication-verify") {
    const challengeId = readRequiredString(body.challengeId, "challengeId");
    const credential = body.credential;
    if (
      !credential || typeof credential !== "object" || !("id" in credential) ||
      typeof credential.id !== "string"
    ) {
      throw new HttpError(400, "Missing authenticator response.");
    }

    const user = await getActiveAdmin(username);
    const { data: storedCredential, error } = await supabase
      .from("webauthn_credentials")
      .select("credential_id, public_key, counter, transports")
      .eq("credential_id", credential.id)
      .eq("username", username)
      .maybeSingle();
    if (error) {
      throw new Error(`Could not load authenticator: ${error.message}`);
    }
    if (!storedCredential) {
      throw new HttpError(
        401,
        "Authenticator is not registered for this account.",
      );
    }

    const expectedChallenge = await consumeChallenge(
      challengeId,
      username,
      "authentication",
    );
    const verification = await verifyAuthenticationResponse({
      response: credential as Parameters<
        typeof verifyAuthenticationResponse
      >[0]["response"],
      expectedChallenge,
      expectedOrigin: expectedOrigins,
      expectedRPID: rpID!,
      credential: {
        id: storedCredential.credential_id,
        publicKey: decodeBase64Url(storedCredential.public_key),
        counter: Number(storedCredential.counter),
        transports: storedCredential.transports,
      },
    });
    if (!verification.verified) {
      throw new HttpError(401, "Authenticator response could not be verified.");
    }

    const { error: updateError, data: updatedCredential } = await supabase
      .from("webauthn_credentials")
      .update({ counter: verification.authenticationInfo.newCounter })
      .eq("credential_id", storedCredential.credential_id)
      .eq("counter", storedCredential.counter)
      .select("credential_id")
      .maybeSingle();
    if (updateError) {
      throw new Error(
        `Could not update authenticator counter: ${updateError.message}`,
      );
    }
    if (!updatedCredential) {
      throw new HttpError(409, "Authenticator counter changed; try again.");
    }

    return {
      verified: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        department: user.department,
        role: user.role,
        is_admin: user.is_admin,
        active: user.active,
      },
    };
  }

  throw new HttpError(400, "Unsupported WebAuthn action.");
};

const encodeBase64Url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");

const decodeBase64Url = (encoded: string) => {
  const base64 = encoded.replaceAll("-", "+").replaceAll("_", "/");
  const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new HttpError(400, "Invalid request body.");
    }
    return jsonResponse(await handleRequest(body));
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse({ error: error.message }, error.status);
    }
    console.error("WebAuthn request failed:", error);
    return jsonResponse({
      error: "WebAuthn request failed. Check the function logs for details.",
    }, 500);
  }
});
