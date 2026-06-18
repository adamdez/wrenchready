import type { Metadata } from "next";
import JeffFieldFilesPage from "@/app/ops/jeff/page";

export const metadata: Metadata = {
  title: "Jeff Field Files",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default JeffFieldFilesPage;
