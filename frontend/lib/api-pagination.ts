import api from "@/lib/api";

export async function getAllPages<T>(path: string, params: Record<string, string | number> = {}): Promise<T[]> {
  const limit = 100;
  const first = await api.get(path, { params: { ...params, page: 1, limit } });
  const firstItems = first.data?.data?.items;
  if (!Array.isArray(firstItems)) throw new Error("The server returned an invalid list.");

  const pages = Number(first.data?.data?.pagination?.pages) || 1;
  if (!Number.isSafeInteger(pages) || pages < 1) throw new Error("The server returned invalid pagination data.");
  const remaining = await Promise.all(
    Array.from({ length: pages - 1 }, (_, index) =>
      api.get(path, { params: { ...params, page: index + 2, limit } }),
    ),
  );
  return [
    ...firstItems,
    ...remaining.flatMap((response) => {
      const items = response.data?.data?.items;
      if (!Array.isArray(items)) throw new Error("The server returned an invalid list.");
      return items;
    }),
  ] as T[];
}
