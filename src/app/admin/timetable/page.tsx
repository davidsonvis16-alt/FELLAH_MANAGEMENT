import Link from "next/link";
import { db } from "@/lib/db";
import { Card, PageHeader } from "@/components/ui";
import { TimetableGrid } from "@/components/timetable";
import { isoWeekday, todayDateOnly } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function TimetablePage() {
  const classes = await db.class.findMany({
    orderBy: { code: "asc" },
    include: {
      classSubjects: {
        include: { subject: true, teacher: { include: { user: { select: { name: true } } } }, slots: { include: { room: true } } },
      },
    },
  });
  const today = isoWeekday(todayDateOnly());
  const rooms = await db.room.findMany({ include: { _count: { select: { slots: true } } }, orderBy: { name: "asc" } });

  return (
    <>
      <PageHeader title="Timetable" subtitle="Weekly teaching grid per class. Read-only in V1." />
      <div className="mb-4 flex flex-wrap gap-2">
        {rooms.map((r) => (
          <span key={r.id} className="badge">
            {r.name} <span className="muted">&middot; {r._count.slots} lessons/wk &middot; cap {r.capacity}</span>
          </span>
        ))}
      </div>
      <div className="flex flex-col gap-4">
        {classes.map((klass) => (
          <Card
            key={klass.id}
            title={`${klass.code} · ${klass.name}`}
            action={
              <Link href={`/admin/classes/${klass.id}`} className="btn btn-sm">
                Class
              </Link>
            }
            bodyClass=""
          >
            <TimetableGrid
              today={today}
              entries={klass.classSubjects.flatMap((unit) =>
                unit.slots.map((slot) => ({
                  dayOfWeek: slot.dayOfWeek,
                  startsAt: slot.startsAt,
                  code: unit.subject.code,
                  title: unit.subject.name,
                  room: slot.room?.name ?? null,
                  note: unit.teacher?.user.name.split(" ").pop(),
                })),
              )}
            />
          </Card>
        ))}
      </div>
    </>
  );
}
