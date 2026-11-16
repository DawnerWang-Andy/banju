"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { startConversation } from "@/actions/dms";
import { toast, NEED_LOGIN, NEED_LOGIN_MSG } from "@/lib/ui";

export function DmButton({ targetUserId }: { targetUserId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      className="primary-btn"
      style={{ marginTop: 16, letterSpacing: ".1em" }}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const r = await startConversation(targetUserId);
        setBusy(false);
        if (r.error === NEED_LOGIN) return toast(NEED_LOGIN_MSG);
        if (r.error) return toast(r.error);
        if (r.convoId) router.push(`/inbox?c=${r.convoId}`);
      }}
    >
      私信 TA
    </button>
  );
}
