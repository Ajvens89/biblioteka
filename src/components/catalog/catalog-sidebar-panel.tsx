import type { Category, Designer, Publisher, Tag } from "@prisma/client";
import { CatalogSidebarFilters } from "@/components/games/catalog-sidebar-filters";
import type { GameFilterInput } from "@/lib/validations/game";

type Props = {
  categories: Category[];
  tags: Tag[];
  publishers: Publisher[];
  designers: Designer[];
  current: GameFilterInput;
};

export function CatalogSidebarPanel(props: Props) {
  return (
    <aside className="hidden lg:block">
      <div className="zf-catalog-filters sticky top-20 p-5">
        <h2 className="text-h3 mb-4">Filtry</h2>
        <CatalogSidebarFilters {...props} />
      </div>
    </aside>
  );
}
