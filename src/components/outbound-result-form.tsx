"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, LoaderCircle, MessageSquareReply } from "lucide-react";
import type {
  PromiseOutboundChannel,
  PromiseOutboundConversionType,
  RecordOwner,
} from "@/lib/promise-crm/types";

type OutboundResultFormProps = {
  promiseId: string;
  channelType: PromiseOutboundChannel;
  owner: RecordOwner;
};

type ResultStatus = "responded" | "converted" | "failed";

export function OutboundResultForm({
  promiseId,
  channelType,
  owner,
}: OutboundResultFormProps) {
  const router = useRouter();
  const [statusValue, setStatusValue] = useState<ResultStatus>("responded");
  const [summary, setSummary] = useState("");
  const [conversionType, setConversionType] = useState<PromiseOutboundConversionType>("other");
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    setMessage("");

    try {
      const response = await fetch("/api/al/wrenchready/outbound", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          promiseId,
          channelType,
          status: statusValue,
          actor: owner,
          summary: summary.trim() || undefined,
          conversionType: statusValue === "converted" ? conversionType : undefined,
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || "Could not record outbound result.");
      }

      setStatus("success");
      setMessage("Outbound result recorded.");
      setSummary("");
      router.refresh();
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Could not record outbound result.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 rounded-xl border border-border/70 bg-card/50 p-3">
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

      <div className="grid gap-3 md:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
            Result
          </span>
          <select
            className="form-input"
            value={statusValue}
            onChange={(event) => setStatusValue(event.target.value as ResultStatus)}
          >
            <option value="responded">Responded</option>
            <option value="converted">Converted</option>
            <option value="failed">Failed</option>
          </select>
        </label>

        {statusValue === "converted" ? (
          <label className="block space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              Conversion type
            </span>
            <select
              className="form-input"
              value={conversionType}
              onChange={(event) =>
                setConversionType(event.target.value as PromiseOutboundConversionType)
              }
            >
              <option value="review-left">Review left</option>
              <option value="next-visit-requested">Next-visit requested</option>
              <option value="scheduled-next-visit">Scheduled next visit</option>
              <option value="other">Other</option>
            </select>
          </label>
        ) : null}
      </div>

      <label className="mt-3 block space-y-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
          Result note
        </span>
        <textarea
          className="form-textarea"
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
          placeholder="What happened after the outbound touch?"
        />
      </label>

      <button
        type="submit"
        disabled={status === "saving"}
        className="mt-3 inline-flex items-center gap-2 rounded-full border border-border px-3 py-2 text-xs font-medium text-foreground transition-all hover:bg-secondary disabled:opacity-50"
      >
        {status === "saving" ? (
          <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
        ) : status === "success" ? (
          <CheckCircle2 className="h-3.5 w-3.5" />
        ) : (
          <MessageSquareReply className="h-3.5 w-3.5" />
        )}
        Record outbound result
      </button>
    </form>
  );
}
