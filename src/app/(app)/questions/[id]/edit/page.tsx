import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { QuestionAdminForm } from "@/components/questions/question-admin-form";
import { updateQuestionAction } from "../../actions";
import { getRepositories } from "@/lib/data";

export default async function EditQuestionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { engagements } = getRepositories();
  const question = await engagements.getQuestion(id);
  if (!question) notFound();

  // Editing an existing question doesn't change its template kind.
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Edit question" description={question.prompt} />
      <QuestionAdminForm action={updateQuestionAction} kind="" question={question} />
    </div>
  );
}
