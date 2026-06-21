import { NextResponse } from "next/server";
import { getPromiseRecords, updatePromiseRecord } from "@/lib/promise-crm/server";
import {
  ARCHIVE_NOTE,
  isLikelyTestPromise,
  isPromiseArchived,
} from "@/lib/promise-crm/promise-archive";

export const dynamic = "force-dynamic";

function describe(promise: { id: string; customer: { name: string }; serviceScope: string }) {
  return { id: promise.id, customer: promise.customer.name, service: promise.serviceScope };
}

async function getCandidates() {
  const promises = await getPromiseRecords();
  return promises.filter((p) => !isPromiseArchived(p) && isLikelyTestPromise(p));
}

/** Dry-run preview — lists obviously-test records that WOULD be archived. Read-only. */
export async function GET() {
  try {
    const candidates = await getCandidates();
    return NextResponse.json({
      dryRun: true,
      count: candidates.length,
      candidates: candidates.map(describe),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to scan for test records." },
      { status: 500 },
    );
  }
}

/** Archive every obviously-test record. Reversible — restore from /ops/promises/archived. */
export async function POST() {
  try {
    const candidates = await getCandidates();
    const archived: ReturnType<typeof describe>[] = [];
    for (const promise of candidates) {
      try {
        await updatePromiseRecord(promise.id, { noteToAdd: ARCHIVE_NOTE });
        archived.push(describe(promise));
      } catch {
        // Skip a record that fails to update; the rest still archive.
      }
    }
    return NextResponse.json({ success: true, archived: archived.length, records: archived });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to archive test records." },
      { status: 500 },
    );
  }
}
