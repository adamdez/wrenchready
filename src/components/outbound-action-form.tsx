"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, LoaderCircle, Send } from "lucide-react";
import type { OutboundQueueItem } from "@/lib/promise-crm/types";

type OutboundActionFormProps = {
  item: OutboundQueueItem;
};

export function OutboundActionForm({ item }: OutboundActionFormProps) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function queueSend() {
    setStatus("sending");
    setMessage("");

    try {
      const response = await fetch("/api/al/wrenchready/outbound", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          promiseId: item.promiseId,
          channelType: item.channelType,
          deliveryMethod: "webhook",
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || "Could not queue outbound.");
      }

      setStatus("success");
      setMessage("Queued for delivery.");
      router.refresh();
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Could not queue outbound.");
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-border/70 bg-card/50 p-3">
      {message ? (
        <div
          className={`mb-3 rounded-2xl border px-3 py-2 text-xs ${
            status === "success"
              ? "border-[--wr-teal]/20 bg-[--wr-teal]/10 text-[--wr-teal-soft]"
              : "border-red-500/20 bg-red-500/10 text-red-200"
          }`}
        >
          {message}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <div className="rounded-full border border-border px-3 py-2 text-[11px] text-muted-foreground">
          {item.transport.destinationLabel}
        </div>
        <button
          type="button"
          onClick={() => void queueSend()}
          disabled={status === "sending" || !item.transport.enabled}
          className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-2 text-xs font-medium text-foreground transition-all hover:bg-secondary disabled:opacity-50"
        >
          {status === "sending" ? (
            <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
          ) : status === "success" ? (
            <CheckCircle2 className="h-3.5 w-3.5" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
          Queue delivery
        </button>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{item.transport.nextStep}</p>
    </div>
  );
}
