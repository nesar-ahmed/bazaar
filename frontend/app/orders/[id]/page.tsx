import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { OrderDetail } from "@/app/components/order-confirmation";
import { orderRef } from "@/lib/format";
import { getOrder } from "@/lib/catalog";

export const dynamic = "force-dynamic";

function reference(id: string): number | null {
  const numeric = Number(id);
  return Number.isInteger(numeric) && numeric > 0 ? numeric : null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const numeric = reference(id);
  return {
    title: numeric ? `Order ${orderRef(numeric)}` : "Order not found",
    description: "The lines, the amount and the stage of one Bazaar order.",
  };
}

export default async function OrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getOrder(id);
  // null means the read failed for any reason: unknown reference, another
  // account's order, or the service not answering. not-found.tsx says so.
  if (!order) notFound();

  return (
    <div className="container flow-page">
      <OrderDetail order={order} />
    </div>
  );
}
