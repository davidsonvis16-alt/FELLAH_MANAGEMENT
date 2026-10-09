import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { TeacherForm } from "./teacher-form";

export default function NewTeacherPage() {
  return (
    <>
      <PageHeader
        title="Add a teacher"
        subtitle="Creates the staff record and their sign-in account."
        action={
          <Link href="/admin/teachers" className="btn">
            Back to teachers
          </Link>
        }
      />
      <div className="max-w-[520px]">
        <TeacherForm />
      </div>
    </>
  );
}
