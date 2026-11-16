import { getCurrentUser } from "@/lib/session";
import { getHotFeed } from "@/lib/feed";
import { Feed } from "@/components/Feed";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: { t?: string };
}) {
  const user = await getCurrentUser();
  const tab = searchParams.t || "ALL";
  const posts = await getHotFeed(user?.id || null, tab, 80);
  return <Feed init={posts} tab={tab} loggedIn={!!user} />;
}
