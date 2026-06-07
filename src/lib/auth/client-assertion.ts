/**
 * Microsoft Entra ID certificate-based client authentication (ADR-0005).
 *
 * Instead of a shared client secret, the application proves its identity to the
 * Entra token endpoint with a signed JWT "client assertion" (private_key_jwt).
 * The private key lives in a PFX on the host (local: a gitignored path; Azure:
 * Key Vault / App Service certificate) and never enters source control.
 *
 * Spec: https://learn.microsoft.com/entra/identity-platform/certificate-credentials
 * The assertion MUST carry an `x5t` header (base64url of the cert's SHA-1
 * thumbprint) so Entra can match it to the certificate registered on the app.
 *
 * Server-only. Uses Node's filesystem + crypto; never bundle into the client.
 */
import "server-only";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import forge from "node-forge";
import { SignJWT, importPKCS8, type KeyLike } from "jose";
import { entraEnv, assertEntraEnv } from "@/lib/env";

interface CertMaterial {
  /** PKCS#8 private key, imported for RS256 signing. */
  privateKey: KeyLike;
  /** base64url(SHA-1(DER cert)) — the `x5t` JWT header value Entra requires. */
  x5t: string;
}

let cached: Promise<CertMaterial> | null = null;

/**
 * Parse the PFX once and cache the imported key + thumbprint for the process
 * lifetime. The PFX password and path come only from the environment.
 */
function loadCertMaterial(): Promise<CertMaterial> {
  cached ??= (async () => {
    assertEntraEnv(); // fail closed at runtime if misconfigured
    const pfxBytes = readFileSync(entraEnv.certPfxPath);

    // node-forge parses PKCS#12; Node's crypto cannot do so natively.
    const p12Asn1 = forge.asn1.fromDer(pfxBytes.toString("binary"));
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, entraEnv.certPfxPassword);

    // Private key (shrouded PKCS#8 key bag, the usual PFX layout).
    const keyBags = p12.getBags({
      bagType: forge.pki.oids.pkcs8ShroudedKeyBag,
    })[forge.pki.oids.pkcs8ShroudedKeyBag];
    const keyBag = keyBags?.[0];
    if (!keyBag?.key) {
      throw new Error("PFX did not contain an exportable private key.");
    }

    // Re-wrap the RSA key as PKCS#8 PEM ("PRIVATE KEY") for jose.importPKCS8.
    const pkcs8Asn1 = forge.pki.wrapRsaPrivateKey(
      forge.pki.privateKeyToAsn1(keyBag.key),
    );
    const pkcs8Pem = forge.pki.privateKeyInfoToPem(pkcs8Asn1);
    const privateKey = await importPKCS8(pkcs8Pem, "RS256");

    // Certificate → DER → SHA-1 → base64url == x5t.
    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })[
      forge.pki.oids.certBag
    ];
    const cert = certBags?.[0]?.cert;
    if (!cert) {
      throw new Error("PFX did not contain a certificate.");
    }
    const certDer = forge.asn1
      .toDer(forge.pki.certificateToAsn1(cert))
      .getBytes();
    const sha1 = forge.md.sha1.create();
    sha1.update(certDer);
    const x5t = Buffer.from(sha1.digest().toHex(), "hex").toString("base64url");

    return { privateKey, x5t };
  })();
  return cached;
}

/**
 * Build a fresh, short-lived signed client assertion for the token request.
 * Called once per token exchange (assertions are single-use, ~10 min lifetime).
 */
export async function buildClientAssertion(): Promise<string> {
  const { privateKey, x5t } = await loadCertMaterial();
  const clientId = entraEnv.clientId;

  return new SignJWT({})
    .setProtectedHeader({ alg: "RS256", typ: "JWT", x5t })
    .setIssuer(clientId)
    .setSubject(clientId)
    .setAudience(entraEnv.tokenEndpoint)
    .setJti(randomUUID())
    .setIssuedAt()
    .setNotBefore("0s")
    .setExpirationTime("10m")
    .sign(privateKey);
}
