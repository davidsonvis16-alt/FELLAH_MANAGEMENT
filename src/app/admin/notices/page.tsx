import { noticesFor } from "@/lib/queries";
import { deleteAnnouncement } from "@/lib/actions/office";
import { Card, Empty, PageHeader } from "@/components/ui";
import { formatDateTime } from "@/lib/dates";
import { AUDIENCE_LABELS, type Audience } from "@/lib/enums";
import { NoticeForm } from "./notice-form";

export const dynamic = "force-dynamic";

export default async function NoticesPage() {
  const notices = await noticesFor(null, 50);
  return (
    <>
      <PageHeader title="Notice board" subtitle="Shown on teacher and student dashboards by audience" />
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card bodyClass="">
          {notices.length === 0 ? (
            <div className="p-4">
              <Empty>No notices posted.</Empty>
            </div>
          ) : (
            <ul className="m-0 list-none p-0">
              {notices.map((n) => (
                <li key={n.id} className="notice" data-pinned={n.pinned}>
                  <div className="flex items-start justify-between gap-3">
                    <p className="m-0 font-semibold">
                      {n.pinned ? <span className="pin">PINNED</span> : null}
                      {n.title}
                    </p>
                    <form action={deleteAnnouncement}>
                      <input type="hidden" name="id" value={n.id} />
                      <button type="submit" className="btn btn-sm" aria-label={`Remove ${n.title}`}>
                        Remove
                      </button>
                    </form>
                  </div>
                  <p className="ink-2 m-0 mt-1 text-[13px]">{n.body}</p>
                  <p className="muted m-0 mt-1.5 text-[11.5px]">
                    {AUDIENCE_LABELS[n.audience as Audience] ?? n.audience} &middot; {n.author?.name ?? "Office"} &middot; {formatDateTime(n.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <NoticeForm />
      </div>
    </>
  );
}
