import { redirect } from "next/navigation";

/** Historical circulation screens are retired; database history is preserved. */
export default function RetiredAdminModulePage() {
  redirect("/admin/gry");
}
