import { NextResponse } from "next/server";
import { getPromiseRecord, updatePromiseRecord } from "@/lib/promise-crm/server";
import {
  ARCHIVE_NOTE,
  UNARCHIVE_NOTE,
  isPromiseArchived,
} from "@/lib/promise-crm/promise-archive";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";

/**
 * Soft-archive / restore a promise. Archived promises drop out of every active
 * view (board, field, tomorrow, sidebar counts) but are never deleted — restore
 * flips them straight back. Used to clear junk/test records.
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const archived = Boolean((body as { archived?: unknown }).archived);

    const promise = await getPromiseRecord(id);
    if (!promise) {
      return NextResponse.json({ error: "Promise record not found." }, { status: 404 });
    }

    if (isPromiseArchived(promise) === archived) {
      return NextResponse.json({ success: true, archived, unchanged: true });
    }

    await updatePromiseRecord(id, {
      noteToAdd: archived ? ARCHIVE_NOTE : UNARCHIVE_NOTE,
    });

    return NextResponse.json({ success: true, archived });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to update archive state.",
      },
      { status: 500 },
    );
  }
}
