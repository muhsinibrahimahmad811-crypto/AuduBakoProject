import { startAuthentication, startRegistration } from '@simplewebauthn/browser';
import { supabase } from '../supabase';

const invokeWebAuthn = async (body) => {
  const { data, error } = await supabase.functions.invoke('webauthn', { body });

  if (error) {
    let message = error.message;
    if (error.context instanceof Response) {
      const response = await error.context.json().catch(() => null);
      if (typeof response?.error === 'string') message = response.error;
    }
    throw new Error(message);
  }

  return data;
};

export async function registerBiometric(username, password) {
  const { challengeId, options } = await invokeWebAuthn({
    action: 'registration-options',
    username,
    password
  });

  const credential = await startRegistration({ optionsJSON: options });
  const { verified } = await invokeWebAuthn({
    action: 'registration-verify',
    username,
    password,
    challengeId,
    credential
  });

  if (!verified) throw new Error('The authenticator registration could not be verified.');
}

export async function authenticateBiometric(username) {
  const { challengeId, options } = await invokeWebAuthn({
    action: 'authentication-options',
    username
  });

  const credential = await startAuthentication({ optionsJSON: options });
  const { verified, user } = await invokeWebAuthn({
    action: 'authentication-verify',
    username,
    challengeId,
    credential
  });

  if (!verified || !user) throw new Error('The authenticator response could not be verified.');
  return user;
}
