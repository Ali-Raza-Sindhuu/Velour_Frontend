import { useCallback, useEffect, useState } from "react";

// Small shared loading/error/data pattern so every page doesn't reinvent it.
// TODO(backend): once resources come from Redux (adminSlice), this can dispatch thunks
// instead of calling the service function directly — the page components won't change.
export function useAdminResource(fetcher, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await fetcher();
      setData(result);
    } catch (err) {
      setError(err?.response?.data?.message || "Something went wrong loading this data.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => { load(); }, [load]);

  return { data, loading, error, reload: load, setData };
}
