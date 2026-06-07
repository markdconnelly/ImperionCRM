import { Icon } from "@/components/ui/icon";
import { sourceMeta } from "@/lib/comms";
import type { SocialIdentityRow } from "@/types";

/** Linked social profiles for a contact (ADR-0025). */
export function SocialIdentities({ identities }: { identities: SocialIdentityRow[] }) {
  if (identities.length === 0) {
    return <p className="text-sm text-dim">No linked social profiles.</p>;
  }
  return (
    <ul className="flex flex-col gap-1.5">
      {identities.map((s) => {
        const meta = sourceMeta(s.platform);
        const inner = (
          <span className="flex items-center gap-2 text-sm">
            <Icon name={meta.icon} size={14} className="text-dim" />
            <span className="text-text">{s.handle ?? s.platform}</span>
            {s.verified && <span className="text-[11px] text-green">verified</span>}
            {s.followerCount != null && (
              <span className="ml-auto text-[11px] text-dim">
                {s.followerCount.toLocaleString()} followers
              </span>
            )}
          </span>
        );
        return (
          <li key={s.id}>
            {s.profileUrl ? (
              <a
                href={s.profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-md px-1 py-0.5 hover:bg-panel-2"
              >
                {inner}
              </a>
            ) : (
              <div className="px-1 py-0.5">{inner}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
