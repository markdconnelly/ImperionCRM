/**
 * Fire-and-forget bronze→silver merge after a manual edit (pipeline ADR-0012).
 *
 * Manual account/contact edits write a website_* bronze row; without this nudge
 * the unified silver record only catches up on the 5-minute sweep. Calling the
 * pipeline's `POST /api/refresh {source:"merge"}` directly (NOT via the
 * provider-keyed REFRESH_SOURCES map) makes the edit visible right away.
 *
 * Truly fire-and-forget per the ADR: the call is never awaited, so a slow or
 * down pipeline can neither fail nor delay the save — the bronze write already
 * succeeded and the 5-minute sweep remains the backstop.
 */
import { pipelineService } from "@/lib/services";
import { isBackendNotConfigured } from "@/lib/services/call-guard";

export function requestMergeRefresh(): void {
  pipelineService.refresh({ source: "merge" }).catch((err: unknown) => {
    // Unconfigured pipeline (env unset or clean 501, #190 taxonomy) → quiet
    // no-op (same as refreshNowAction); anything else is logged but swallowed.
    if (!isBackendNotConfigured(err)) {
      console.error("requestMergeRefresh failed:", err);
    }
  });
}
