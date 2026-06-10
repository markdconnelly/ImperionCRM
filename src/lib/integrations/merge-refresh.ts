/**
 * Fire-and-forget bronze→silver merge after a manual edit (pipeline ADR-0012).
 *
 * Manual account/contact edits write a website_* bronze row; without this nudge
 * the unified silver record only catches up on the 5-minute sweep. Calling the
 * pipeline's `POST /api/refresh {source:"merge"}` directly (NOT via the
 * provider-keyed REFRESH_SOURCES map) makes the edit visible immediately.
 *
 * Never throws: a failed or slow pipeline must not break the save.
 */
import { pipelineService } from "@/lib/services";
import { ServiceNotConfiguredError } from "@/lib/services/external-client";

/**
 * How long a save waits for the merge before moving on. Long enough that the
 * common case (a sub-second single-record sweep) lands before the redirected
 * page renders; short enough that a slow pipeline never holds the save hostage.
 * The in-flight request keeps running after the race — we just stop waiting.
 */
export const MERGE_REFRESH_WAIT_MS = 2500;

export async function requestMergeRefresh(waitMs: number = MERGE_REFRESH_WAIT_MS): Promise<void> {
  try {
    // A rejection that lands after the race is lost stays handled — race keeps
    // its subscription — so losing the race can never surface as unhandled.
    await Promise.race([
      pipelineService.refresh({ source: "merge" }),
      new Promise<void>((resolve) => {
        const t = setTimeout(resolve, waitMs);
        t.unref?.(); // don't hold the process open for the race timer
      }),
    ]);
  } catch (err) {
    // Unconfigured pipeline URL → quiet no-op (same as refreshNowAction); anything
    // else is logged but still swallowed — the bronze write already succeeded and
    // the 5-minute sweep remains the backstop.
    if (!(err instanceof ServiceNotConfiguredError)) {
      console.error("requestMergeRefresh failed:", err);
    }
  }
}
