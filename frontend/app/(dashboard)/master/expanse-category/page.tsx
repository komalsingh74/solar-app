import { Suspense } from "react";
import ExpenseCategoriesPage from "./expense-category-client";
import Loader from "@/components/common/Loader";

export const instant = false;

export default function ExpenseCategoryRoute() {
  return (
    <Suspense fallback={<Loader type="page" text="Loading expense categories..." />}>
      <ExpenseCategoriesPage />
    </Suspense>
  );
}
