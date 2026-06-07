import { PageHeader } from "@/components/ui/page-header";
import { QuestionAdminForm } from "@/components/questions/question-admin-form";
import { createQuestionAction } from "../actions";

export default async function NewQuestionPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const { kind } = await searchParams;
  const k = kind === "assessment" ? "assessment" : "discovery";

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="New question" description={`Add a question to the ${k} questionnaire.`} />
      <QuestionAdminForm action={createQuestionAction} kind={k} />
    </div>
  );
}
