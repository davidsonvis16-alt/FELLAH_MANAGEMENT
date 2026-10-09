/**
 * Seed: one small technical college, four weeks into Term 1.
 *
 * Deterministic (fixed PRNG seed) so the dashboards, positions and the
 * attendance alerts look the same on every reset.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

// ---------------------------------------------------------------- helpers

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20261008);

const pick = <T,>(list: readonly T[]): T => list[Math.floor(rand() * list.length)];
const between = (min: number, max: number) => min + rand() * (max - min);
const intBetween = (min: number, max: number) => Math.floor(between(min, max + 1));

function utc(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day));
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

const TODAY = utc(2026, 10, 8); // a Thursday

const MALE_NAMES = ["Davis", "Brian", "Kevin", "John", "Collins", "Dennis", "Felix", "Victor", "Amos", "Peter", "Elvis", "Samuel", "Gideon", "Emmanuel", "Isaac", "Mark", "Titus", "Eric"];
const FEMALE_NAMES = ["Mary", "Faith", "Grace", "Cynthia", "Mercy", "Joyce", "Sharon", "Wanjiru", "Naomi", "Esther", "Linet", "Purity", "Doreen", "Winnie", "Caroline", "Beatrice"];
const SURNAMES = ["Patrick", "Otieno", "Mwangi", "Kamau", "Cheruiyot", "Wafula", "Omondi", "Njoroge", "Kiprotich", "Achieng", "Barasa", "Mutiso", "Chebet", "Odhiambo", "Kirui", "Wekesa", "Maina", "Nyambura", "Kilonzo", "Rotich"];

function slugEmail(name: string, index: number) {
  const base = name.toLowerCase().replace(/[^a-z]+/g, ".");
  return index === 0 ? `${base}@fellah.ac.ke` : `${base}${index}@fellah.ac.ke`;
}

// ---------------------------------------------------------------- reset

async function reset() {
  await db.activityLog.deleteMany();
  await db.announcement.deleteMany();
  await db.feePayment.deleteMany();
  await db.feeInvoice.deleteMany();
  await db.mark.deleteMany();
  await db.assessment.deleteMany();
  await db.attendance.deleteMany();
  await db.attendanceSession.deleteMany();
  await db.timetableSlot.deleteMany();
  await db.room.deleteMany();
  await db.studentGuardian.deleteMany();
  await db.guardian.deleteMany();
  await db.student.deleteMany();
  await db.classSubject.deleteMany();
  await db.class.deleteMany();
  await db.subject.deleteMany();
  await db.teacher.deleteMany();
  await db.term.deleteMany();
  await db.academicYear.deleteMany();
  await db.user.deleteMany();
}

// ---------------------------------------------------------------- main

async function main() {
  await reset();
  const passwordHash = await bcrypt.hash("password123", 10);

  // --- calendar
  const year = await db.academicYear.create({
    data: { name: "2026/2027", startsOn: utc(2026, 9, 1), endsOn: utc(2027, 7, 31), isCurrent: true },
  });
  const term = await db.term.create({
    data: { name: "Term 1", yearId: year.id, startsOn: utc(2026, 9, 7), endsOn: utc(2026, 12, 11), isCurrent: true },
  });
  await db.term.create({
    data: { name: "Term 2", yearId: year.id, startsOn: utc(2027, 1, 11), endsOn: utc(2027, 4, 9) },
  });

  // --- admin
  const admin = await db.user.create({
    data: {
      email: "admin@fellah.ac.ke",
      passwordHash,
      name: "Aisha Njeri",
      phone: "+254 712 000 100",
      role: "ADMIN",
    },
  });

  // --- teachers
  const teacherSpecs = [
    { name: "Joseph Mwangi", email: "j.mwangi@fellah.ac.ke", qualification: "MSc Applied Mathematics" },
    { name: "Lucy Achieng", email: "l.achieng@fellah.ac.ke", qualification: "MSc Physics" },
    { name: "Peter Kiprotich", email: "p.kiprotich@fellah.ac.ke", qualification: "BSc Chemistry, PGDE" },
    { name: "Hellen Wekesa", email: "h.wekesa@fellah.ac.ke", qualification: "BEng Mechanical Engineering" },
    { name: "Samuel Odhiambo", email: "s.odhiambo@fellah.ac.ke", qualification: "BEng Electrical Engineering" },
    { name: "Grace Kilonzo", email: "g.kilonzo@fellah.ac.ke", qualification: "MA Communication" },
  ];

  const teachers = [];
  for (const [index, spec] of teacherSpecs.entries()) {
    const user = await db.user.create({
      data: {
        email: spec.email,
        passwordHash,
        name: spec.name,
        phone: `+254 7${intBetween(10, 29)} ${intBetween(100, 999)} ${intBetween(100, 999)}`,
        role: "TEACHER",
      },
    });
    teachers.push(
      await db.teacher.create({
        data: {
          userId: user.id,
          staffNo: `TSC/${2100 + index}`,
          qualification: spec.qualification,
          employedOn: utc(2019 + (index % 5), 1 + (index % 9), 10),
        },
      }),
    );
  }

  // --- subjects
  const subjectSpecs = [
    { code: "MAT101", name: "Engineering Mathematics", teacher: 0 },
    { code: "PHY102", name: "Applied Physics", teacher: 1 },
    { code: "CHE103", name: "Engineering Chemistry", teacher: 2 },
    { code: "CAD104", name: "Engineering Drawing", teacher: 3 },
    { code: "MEC105", name: "Mechatronics Principles", teacher: 3 },
    { code: "ELE106", name: "Electrical Circuits", teacher: 4 },
    { code: "COM107", name: "Technical Communication", teacher: 5 },
    { code: "CIV108", name: "Structural Mechanics", teacher: 3 },
  ];
  const subjects = new Map<string, { id: string; name: string }>();
  for (const spec of subjectSpecs) {
    const subject = await db.subject.create({ data: { code: spec.code, name: spec.name } });
    subjects.set(spec.code, subject);
  }

  // --- rooms
  const rooms = [];
  for (const name of ["Workshop 1", "Physics Lab", "Lecture Hall 3", "CAD Studio"]) {
    rooms.push(await db.room.create({ data: { name, capacity: name === "Lecture Hall 3" ? 120 : 40 } }));
  }

  // --- classes and their units
  const classSpecs = [
    { code: "MECH-Y1", name: "Mechatronics - Year 1", level: 1, classTeacher: 3, size: 24, units: ["MAT101", "PHY102", "CAD104", "MEC105", "COM107"] },
    { code: "MECH-Y2", name: "Mechatronics - Year 2", level: 2, classTeacher: 4, size: 18, units: ["MAT101", "ELE106", "MEC105", "CAD104"] },
    { code: "CIV-Y1", name: "Civil Engineering - Year 1", level: 1, classTeacher: 2, size: 20, units: ["MAT101", "CHE103", "CIV108", "CAD104", "COM107"] },
  ];

  type UnitRow = { id: string; classId: string; subjectCode: string; teacherId: string };
  const units: UnitRow[] = [];
  const classes = [];

  for (const spec of classSpecs) {
    const klass = await db.class.create({
      data: {
        code: spec.code,
        name: spec.name,
        level: spec.level,
        capacity: Math.max(40, spec.size),
        classTeacherId: teachers[spec.classTeacher].id,
      },
    });
    classes.push({ ...klass, spec });

    for (const code of spec.units) {
      const subjectSpec = subjectSpecs.find((s) => s.code === code)!;
      const teacherId = teachers[subjectSpec.teacher].id;
      const unit = await db.classSubject.create({
        data: { classId: klass.id, subjectId: subjects.get(code)!.id, teacherId },
      });
      units.push({ id: unit.id, classId: klass.id, subjectCode: code, teacherId });
    }
  }

  // --- timetable: each unit meets three times a week
  const PERIODS = [
    { startsAt: "08:00", endsAt: "10:00" },
    { startsAt: "10:30", endsAt: "12:30" },
    { startsAt: "14:00", endsAt: "16:00" },
  ];
  for (const klass of classes) {
    const classUnits = units.filter((u) => u.classId === klass.id);
    const cells: { day: number; period: number }[] = [];
    for (let day = 1; day <= 5; day += 1) {
      for (let period = 0; period < PERIODS.length; period += 1) cells.push({ day, period });
    }
    // Deal three cells to each unit, in order, so no two units of a class collide.
    let cursor = 0;
    for (const unit of classUnits) {
      for (let n = 0; n < 3 && cursor < cells.length; n += 1) {
        const cell = cells[cursor];
        cursor += 1;
        await db.timetableSlot.create({
          data: {
            classSubjectId: unit.id,
            dayOfWeek: cell.day,
            startsAt: PERIODS[cell.period].startsAt,
            endsAt: PERIODS[cell.period].endsAt,
            roomId: pick(rooms).id,
          },
        });
      }
    }
  }

  // --- students
  type StudentRow = { id: string; classId: string; name: string; profile: "strong" | "steady" | "struggling" };
  const students: StudentRow[] = [];
  let admissionCounter = 1;
  const usedEmails = new Set<string>();

  for (const klass of classes) {
    for (let n = 0; n < klass.spec.size; n += 1) {
      const female = rand() < 0.42;
      const first = female ? pick(FEMALE_NAMES) : pick(MALE_NAMES);
      const last = pick(SURNAMES);
      // Davis Patrick and Kevin Otieno are fixed: the demo walkthrough uses them.
      const forced =
        klass.spec.code === "MECH-Y1" && n === 0
          ? { first: "Davis", last: "Patrick", profile: "steady" as const }
          : klass.spec.code === "MECH-Y1" && n === 2
            ? { first: "Kevin", last: "Otieno", profile: "struggling" as const }
            : null;

      const name = forced ? `${forced.first} ${forced.last}` : `${first} ${last}`;
      let suffix = 0;
      let email = slugEmail(name, suffix);
      while (usedEmails.has(email)) {
        suffix += 1;
        email = slugEmail(name, suffix);
      }
      usedEmails.add(email);

      const roll = rand();
      const profile: StudentRow["profile"] = forced
        ? forced.profile
        : roll < 0.25
          ? "strong"
          : roll < 0.85
            ? "steady"
            : "struggling";

      const user = await db.user.create({
        data: {
          email,
          passwordHash,
          name,
          phone: `+254 7${intBetween(10, 29)} ${intBetween(100, 999)} ${intBetween(100, 999)}`,
          role: "STUDENT",
        },
      });

      const student = await db.student.create({
        data: {
          userId: user.id,
          admissionNo: `FEL/${String(admissionCounter).padStart(4, "0")}/26`,
          classId: klass.id,
          gender: forced ? "MALE" : female ? "FEMALE" : "MALE",
          dateOfBirth: utc(intBetween(2004, 2008), intBetween(1, 12), intBetween(1, 28)),
          admittedOn: utc(2026, 9, 7),
          status: "ACTIVE",
          address: `${pick(["Nyeri", "Kisumu", "Eldoret", "Nakuru", "Thika", "Machakos", "Kitale", "Mombasa"])}, Kenya`,
        },
      });
      admissionCounter += 1;
      students.push({ id: student.id, classId: klass.id, name, profile });

      // --- guardians
      const guardianCount = rand() < 0.3 ? 2 : 1;
      for (let g = 0; g < guardianCount; g += 1) {
        const guardianFemale = g === 0 ? rand() < 0.5 : true;
        const guardian = await db.guardian.create({
          data: {
            name: `${guardianFemale ? pick(FEMALE_NAMES) : pick(MALE_NAMES)} ${last}`,
            phone: `+254 7${intBetween(10, 29)} ${intBetween(100, 999)} ${intBetween(100, 999)}`,
            email: rand() < 0.5 ? `${last.toLowerCase()}.family${intBetween(1, 999)}@gmail.com` : null,
            occupation: pick(["Farmer", "Teacher", "Trader", "Nurse", "Driver", "Civil servant", "Mechanic", "Tailor"]),
            relationship: g === 0 ? (guardianFemale ? "MOTHER" : "FATHER") : "GUARDIAN",
            address: `${pick(["Nyeri", "Kisumu", "Eldoret", "Nakuru", "Thika"])}, Kenya`,
          },
        });
        await db.studentGuardian.create({
          data: { studentId: student.id, guardianId: guardian.id, isPrimary: g === 0 },
        });
      }
    }
  }

  // --- attendance: four weeks of timetabled sessions up to today
  const slots = await db.timetableSlot.findMany({ include: { classSubject: true } });
  const termStart = utc(2026, 9, 14);
  const attendanceRows: { sessionId: string; studentId: string; status: string }[] = [];

  for (let week = 0; week < 4; week += 1) {
    for (const slot of slots) {
      const date = addDays(termStart, week * 7 + (slot.dayOfWeek - 1));
      if (date > TODAY) continue;

      const period = PERIODS.findIndex((p) => p.startsAt === slot.startsAt) + 1;
      const unit = units.find((u) => u.id === slot.classSubjectId)!;
      const session = await db.attendanceSession.create({
        data: {
          classSubjectId: slot.classSubjectId,
          termId: term.id,
          date,
          period,
          takenById: unit.teacherId,
        },
      });

      for (const student of students.filter((s) => s.classId === unit.classId)) {
        const roll = rand();
        const absentChance = student.profile === "struggling" ? 0.3 : student.profile === "steady" ? 0.06 : 0.02;
        const lateChance = student.profile === "struggling" ? 0.14 : 0.07;
        const status =
          roll < absentChance ? "ABSENT" : roll < absentChance + lateChance ? "LATE" : roll < absentChance + lateChance + 0.02 ? "EXCUSED" : "PRESENT";
        attendanceRows.push({ sessionId: session.id, studentId: student.id, status });
      }
    }
  }

  for (let i = 0; i < attendanceRows.length; i += 500) {
    await db.attendance.createMany({ data: attendanceRows.slice(i, i + 500) });
  }

  // --- assessments and marks
  const assessmentSpecs = [
    { name: "CAT 1", kind: "CAT", maxScore: 30, weight: 25, dueOn: utc(2026, 9, 25), state: "marked" },
    { name: "Assignment 1", kind: "ASSIGNMENT", maxScore: 20, weight: 10, dueOn: utc(2026, 10, 2), state: "partial" },
    { name: "CAT 2", kind: "CAT", maxScore: 30, weight: 25, dueOn: utc(2026, 10, 16), state: "open" },
    { name: "Final Exam", kind: "EXAM", maxScore: 40, weight: 40, dueOn: utc(2026, 12, 4), state: "future" },
  ];

  const markRows: { assessmentId: string; studentId: string; score: number | null; submittedAt: Date | null; enteredById: string }[] = [];

  for (const unit of units) {
    const classStudents = students.filter((s) => s.classId === unit.classId);
    for (const spec of assessmentSpecs) {
      const assessment = await db.assessment.create({
        data: {
          classSubjectId: unit.id,
          termId: term.id,
          name: spec.name,
          kind: spec.kind,
          maxScore: spec.maxScore,
          weight: spec.weight,
          dueOn: spec.dueOn,
          publishedAt: spec.state === "marked" || spec.state === "partial" ? addDays(spec.dueOn, 3) : null,
        },
      });

      if (spec.state === "future" || spec.state === "open") continue;

      for (const student of classStudents) {
        // 12% of the overdue assignment is never handed in - that is what makes
        // "missing work" a real number rather than a zero.
        const missing = spec.state === "partial" && rand() < 0.12;
        if (missing) {
          markRows.push({ assessmentId: assessment.id, studentId: student.id, score: null, submittedAt: null, enteredById: unit.teacherId });
          continue;
        }
        const centre = student.profile === "strong" ? 0.82 : student.profile === "steady" ? 0.66 : 0.44;
        const ratio = Math.max(0.1, Math.min(1, centre + between(-0.12, 0.12)));
        markRows.push({
          assessmentId: assessment.id,
          studentId: student.id,
          score: Math.round(ratio * spec.maxScore * 2) / 2,
          submittedAt: addDays(spec.dueOn, -intBetween(0, 2)),
          enteredById: unit.teacherId,
        });
      }
    }
  }

  for (let i = 0; i < markRows.length; i += 500) {
    await db.mark.createMany({ data: markRows.slice(i, i + 500) });
  }

  // --- fees: two invoices per student, paid in full, in part or not at all
  const FEES = [
    { description: "Tuition", amount: 42500 },
    { description: "Workshop & materials", amount: 6500 },
  ];
  const bursarRecorder = admin.id;
  for (const student of students) {
    const roll = rand();
    const payable = FEES.reduce((sum, f) => sum + f.amount, 0);
    // Strong payers clear the bill; a few owe everything.
    let toPay = roll < 0.55 ? payable : roll < 0.88 ? Math.round((payable * between(0.3, 0.85)) / 500) * 500 : 0;
    for (const fee of FEES) {
      const invoice = await db.feeInvoice.create({
        data: { studentId: student.id, termId: term.id, description: fee.description, amount: fee.amount, dueOn: utc(2026, 9, 30) },
      });
      const amount = Math.min(fee.amount, toPay);
      toPay -= amount;
      if (amount <= 0) continue;
      // Split larger payments into two instalments, as parents usually pay.
      const parts = amount > 20000 && rand() < 0.5 ? [Math.round(amount * 0.6), amount - Math.round(amount * 0.6)] : [amount];
      for (const [i, part] of parts.entries()) {
        const method = pick(["MPESA", "MPESA", "MPESA", "BANK", "CASH"] as const);
        await db.feePayment.create({
          data: {
            invoiceId: invoice.id,
            amount: part,
            method,
            reference: method === "MPESA" ? `S${Math.floor(rand() * 36 ** 8).toString(36).toUpperCase().padStart(8, "K")}` : method === "BANK" ? `EQ${intBetween(100000, 999999)}` : null,
            paidOn: addDays(utc(2026, 9, 1), intBetween(0, 10) + i * intBetween(10, 25)),
            recordedById: bursarRecorder,
          },
        });
      }
    }
  }

  // --- notice board
  await db.announcement.createMany({
    data: [
      {
        title: "CAT 2 week: 12-16 October",
        body: "CAT 2 runs across all units next week. Timetables are unchanged; each unit sits its CAT in its usual slot. Students with fee balances above KSh 20,000 should see the bursar before Monday.",
        audience: "ALL",
        pinned: true,
        authorId: admin.id,
        createdAt: addDays(TODAY, -2),
      },
      {
        title: "Workshop safety induction - Year 1",
        body: "All Year 1 students must complete the workshop safety induction with Hellen Wekesa before using Workshop 1. Closed shoes and overalls are required.",
        audience: "STUDENTS",
        pinned: false,
        authorId: admin.id,
        createdAt: addDays(TODAY, -6),
      },
      {
        title: "Marks deadline for Assignment 1",
        body: "Please have Assignment 1 marks entered by Friday 9 October so mid-term progress reports can go out to parents.",
        audience: "STAFF",
        pinned: false,
        authorId: admin.id,
        createdAt: addDays(TODAY, -3),
      },
      {
        title: "Mid-term break: 30 Oct - 2 Nov",
        body: "The college closes on Thursday 29 October at 4pm and reopens on Tuesday 3 November.",
        audience: "ALL",
        pinned: false,
        authorId: admin.id,
        createdAt: addDays(TODAY, -12),
      },
    ],
  });

  // --- activity log
  const mechY1 = classes.find((c) => c.spec.code === "MECH-Y1")!;
  await db.activityLog.createMany({
    data: [
      { actorId: admin.id, action: "term.opened", entity: "Term", entityId: term.id, summary: "Term 1 2026/2027 opened", createdAt: addDays(TODAY, -21) },
      { actorId: admin.id, action: "class.created", entity: "Class", entityId: mechY1.id, summary: "Created class Mechatronics - Year 1", createdAt: addDays(TODAY, -20) },
      { actorId: teachers[0].userId, action: "marks.entered", entity: "Assessment", summary: "Joseph Mwangi entered CAT 1 marks for Engineering Mathematics", createdAt: addDays(TODAY, -9) },
      { actorId: teachers[3].userId, action: "attendance.saved", entity: "AttendanceSession", summary: "Hellen Wekesa marked attendance for Engineering Drawing", createdAt: addDays(TODAY, -1) },
      { actorId: teachers[1].userId, action: "marks.entered", entity: "Assessment", summary: "Lucy Achieng entered Assignment 1 marks for Applied Physics", createdAt: addDays(TODAY, -1) },
    ],
  });

  const counts = {
    users: await db.user.count(),
    students: await db.student.count(),
    teachers: await db.teacher.count(),
    classes: await db.class.count(),
    units: await db.classSubject.count(),
    sessions: await db.attendanceSession.count(),
    attendance: await db.attendance.count(),
    assessments: await db.assessment.count(),
    marks: await db.mark.count(),
    invoices: await db.feeInvoice.count(),
    payments: await db.feePayment.count(),
  };
  console.log("Seeded:", counts);
  console.log("Open /login and pick a demo role, or sign in with admin@fellah.ac.ke / password123");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
