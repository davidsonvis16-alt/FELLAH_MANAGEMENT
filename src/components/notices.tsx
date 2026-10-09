import { Card, Empty } from "./ui";
import { relativeTime } from "@/lib/dates";
import { AUDIENCE_LABELS, type Audience } from "@/lib/enums";

type Notice = { id: string; title: string; body: string; audience: string; pinned: boolean; createdAt: Date; author: { name: string } | null };

export function NoticeBoard({ notices, title = "Notice board", action }: { notices: Notice[]; title?: string; action?: React.ReactNode }) {
  return (
    <Card title={title} action={action} bodyClass="">
      {notices.length === 0 ? (
        <div className="p-4">
          <Empty>No notices.</Empty>
        </div>
      ) : (
        <ul className="m-0 list-none p-0">
          {notices.map((n) => (
            <li key={n.id} className="notice" data-pinned={n.pinned}>
              <div className="flex items-baseline justify-between gap-3">
                <p className="m-0 font-semibold">
                  {n.pinned ? (
                    <span className="pin" aria-label="Pinned">
                      PINNED
                    </span>
                  ) : null}
                  {n.title}
                </p>
                <span className="muted shrink-0 text-[12px]">{relativeTime(n.createdAt)}</span>
              </div>
              <p className="ink-2 m-0 mt-1 text-[13px]">{n.body}</p>
              <p className="muted m-0 mt-1.5 text-[11.5px]">
                {AUDIENCE_LABELS[n.audience as Audience] ?? n.audience} &middot; {n.author?.name ?? "Office"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
