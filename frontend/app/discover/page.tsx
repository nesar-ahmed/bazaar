import { CatalogView } from "@/app/components/catalog-view";
import { getCategories, getHealth, getProducts } from "@/lib/catalog";
import { categoryBySlug } from "@/lib/catalog-utils";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

const PAGE = 24;

type SearchParams = Promise<{
  q?: string;
  category?: string;
  sort?: string;
  view?: string;
}>;

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const params = await searchParams;
  const categories = await getCategories();
  const category = categoryBySlug(categories, params.category);
  if (category) {
    return {
      title: `${category.name} pieces`,
      description: category.description ?? `Every ${category.name.toLowerCase()} piece Bazaar currently holds, with live stock counts.`,
    };
  }
  if (params.q) {
    return {
      title: `Search: ${params.q}`,
      description: `Pieces matching “${params.q}”.`,
    };
  }
  return {
    title: "The collection",
    description:
      "Every piece on the shelf with its live stock count and price, filterable by aisle and search.",
  };
}

export default async function DiscoverPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const categories = await getCategories();
  const active = categoryBySlug(categories, params.category) ?? null;
  const shelf = await getProducts({
    categoryId: active?.id ?? null,
    search: params.q ?? null,
    offset: 0,
    limit: PAGE,
  });

  // The catalog returns a bare array, so a full page is the only "more" signal.
  const hasMore = shelf.length === PAGE;
  if (categories.length === 0 && shelf.length === 0 && !(await getHealth())) {
    return <ServiceBoard />;
  }

  return (
    <div className="container">
      <CatalogView
        categories={categories}
        initialProducts={shelf}
        initialHasMore={hasMore}
        pageLimit={PAGE}
      />
    </div>
  );
}

function ServiceBoard() {
  return (
    <div className="container section">
      <div className="notice-board">
        <strong>Bazaar&apos;s API is unavailable.</strong>
        Neither aisles nor pieces can be read right now, so this page is deliberately empty.
        Check{" "}
        <a className="link" href="/api/health">
          /api/health
        </a>{" "}
        or try again in a moment.
      </div>
    </div>
  );
}
