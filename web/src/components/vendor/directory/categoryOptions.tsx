import type { PickerOption } from "@/components/ui/Picker";
import { Rings } from "@/components/ui/Rings";
import { VENDOR_CATEGORIES } from "@/lib/api";

import { CATEGORY_ART } from "./categoryArt";

/** Category choices for every Picker (hero search, directory filter, 404):
 * each category with its real photo (small 720px file) and what it covers;
 * "all" carries the two-rings motif instead of a photo. */
export function categoryOptions(allLabel = "Semua kategori"): PickerOption[] {
  return [
    {
      value: "",
      label: allLabel,
      description: "Semua jenis vendor pernikahan",
      icon: <Rings className="w-4" stroke="currentColor" strokeWidth={4} />,
    },
    ...VENDOR_CATEGORIES.map((c) => {
      const art = CATEGORY_ART[c.value];
      return { value: c.value, label: c.label, description: art?.covers, image: art?.src.replace("-1400.", "-720.") };
    }),
  ];
}
