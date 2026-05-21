import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useSiteContent<T>(page: string, section: string, fallback: T): T {
  const [content, setContent] = useState<T>(fallback);

  useEffect(() => {
    supabase
      .from("site_content" as any)
      .select("content")
      .eq("page", page)
      .eq("section", section)
      .maybeSingle()
      .then(({ data }: any) => {
        if (data?.content && Object.keys(data.content).length > 0) {
          setContent(data.content as T);
        }
      });
  }, [page, section]);

  return content;
}
