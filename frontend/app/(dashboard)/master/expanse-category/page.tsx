import { Suspense } from "react";
import ExpenseCategoriesPage from "./expense-category-client";

export const instant = false;

export default function ExpenseCategoryRoute() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading expense categories...</div>}>
      <ExpenseCategoriesPage />
    </Suspense>
  );
}
