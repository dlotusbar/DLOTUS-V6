import api from "./api";

const decode = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - s.length % 4) % 4)), c => c.charCodeAt(0));
const encode = (b) => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const credentialJSON = (c) => ({
  id: c.id, rawId: encode(c.rawId), type: c.type,
  response: c.response.attestationObject ? {
    clientDataJSON: encode(c.response.clientDataJSON),
    attestationObject: encode(c.response.attestationObject),
    transports: c.response.getTransports?.() || [],
  } : {
    clientDataJSON: encode(c.response.clientDataJSON),
    authenticatorData: encode(c.response.authenticatorData),
    signature: encode(c.response.signature),
    userHandle: c.response.userHandle ? encode(c.response.userHandle) : null,
  }, clientExtensionResults: c.getClientExtensionResults(),
});
export const passkeySupported = () => window.isSecureContext && !!window.PublicKeyCredential && !!navigator.credentials;
export async function registerPasskey() {
  const { data } = await api.post("/auth/passkey/register/options");
  const o = data.options;
  o.challenge = decode(o.challenge);
  o.user.id = decode(o.user.id);
  o.excludeCredentials = (o.excludeCredentials || []).map(x => ({...x, id: decode(x.id)}));
  const cred = await navigator.credentials.create({publicKey: o});
  if (!cred) throw new Error("Cadastro cancelado");
  await api.post("/auth/passkey/register/verify", {challenge_id: data.challenge_id, credential: credentialJSON(cred)});
}
export async function authenticatePasskey(username) {
  const { data } = await api.post("/auth/passkey/login/options", {username});
  const o = data.options;
  o.challenge = decode(o.challenge);
  o.allowCredentials = (o.allowCredentials || []).map(x => ({...x, id: decode(x.id)}));
  const cred = await navigator.credentials.get({publicKey: o});
  if (!cred) throw new Error("Autenticação cancelada");
  const response = await api.post("/auth/passkey/login/verify", {challenge_id: data.challenge_id, credential: credentialJSON(cred)});
  return response.data;
}
