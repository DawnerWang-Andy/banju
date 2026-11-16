import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { TopicForm } from "@/components/TopicForm";

export const dynamic = "force-dynamic";

export default async function TopicNewPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/topics/new");
  return (
    <div className="page-scroll">
      <div className="wrap" style={{ maxWidth: 480, margin: "0 auto" }}>
        <TopicForm />
      </div>
    </div>
  );
}
