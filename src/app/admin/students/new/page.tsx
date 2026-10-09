import Link from "next/link";
import { allClasses } from "@/lib/queries";
import { PageHeader } from "@/components/ui";
import { StudentForm } from "./student-form";

export const dynamic = "force-dynamic";

export default async function NewStudentPage() {
  const classes = await allClasses();
  return (
    <>
      <PageHeader
        title="Admit a student"
        subtitle="Creates the student record and their sign-in account."
        action={
          <Link href="/admin/students" className="btn">
            Back to students
          </Link>
        }
      />
      <StudentForm classes={classes.map((c) => ({ id: c.id, name: c.name }))} />
    </>
  );
}
