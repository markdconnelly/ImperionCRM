"use client";

import { useState } from "react";

/**
 * Destructive "Remove credential" control with an inline two-step confirm (#1282). The repo has
 * no dialog primitive, so the confirm is a managed-state expand: the first click reveals
 * "Confirm" / "Cancel" rather than firing immediately. Submitting posts the connection `id`
 * (and, on the client-mapping screen, its `connector` for revalidation) to the supplied server
 * action — which deletes the row and purges the backing Key Vault secret via the backend.
 */
export function RemoveCredentialButton({
  action,
  connectionId,
  connector,
  label = "Remove credential",
}: {
  action: (formData: FormData) => void | Promise<void>;
  connectionId: string;
  /** Client-mapping connector key, when removing a per-client credential (for revalidation). */
  connector?: string;
  label?: string;
}) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-xs text-dim hover:text-red"
      >
        {label}
      </button>
    );
  }

  return (
    <span className="flex items-center gap-2">
      <span className="text-xs text-dim">Delete &amp; purge its secret?</span>
      <form action={action}>
        <input type="hidden" name="id" value={connectionId} />
        {connector && <input type="hidden" name="connector" value={connector} />}
        <button type="submit" className="text-xs font-medium text-red hover:underline">
          Confirm
        </button>
      </form>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="text-xs text-dim hover:text-text"
      >
        Cancel
      </button>
    </span>
  );
}
