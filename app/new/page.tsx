import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { ComposeForm } from "@/components/ComposeForm";

export const dynamic = "force-dynamic";

export default async function NewPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/new");
  return <ComposeForm />;
}
