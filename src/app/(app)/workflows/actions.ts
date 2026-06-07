"use server";

import { revalidatePath } from "next/cache";
import { getRepositories } from "@/lib/data";

export async function exitEnrollmentAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const { workflows } = getRepositories();
  await workflows.exitEnrollment(id);
  revalidatePath("/workflows");
}
