import { supabase } from "@/integrations/supabase/client";
import type { Project, Chapter } from "@/types/project";

export interface Subscription {
  tier: string;
  word_limit: number;
  words_used: number;
  status: string;
}

export async function getUserSubscription(userId: string): Promise<Subscription> {
  const { data, error } = await supabase.rpc("get_user_subscription", { _user_id: userId });
  if (error) throw error;
  if (!data || (data as any[]).length === 0) return { tier: "free", word_limit: 3000, words_used: 0, status: "active" };
  const row = (data as any[])[0] || data;
  return { tier: row.tier, word_limit: row.word_limit, words_used: row.words_used, status: row.status };
}

export async function incrementWordsUsed(userId: string, amount: number): Promise<void> {
  const { error } = await supabase.rpc("increment_words_used", { _user_id: userId, _amount: amount });
  if (error) throw error;
}

export async function fetchProjects(userId: string): Promise<Project[]> {
  const { data: projects, error } = await supabase
    .from("projects")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  if (!projects?.length) return [];

  const projectIds = projects.map((p) => p.id);
  const { data: chapters, error: chapError } = await supabase
    .from("chapters")
    .select("*")
    .in("project_id", projectIds)
    .order("order_index", { ascending: true });

  if (chapError) throw chapError;

  return projects.map((p) => ({
    id: p.id,
    title: p.title,
    university: p.university || "",
    degree: p.degree || "",
    field_of_study: p.field_of_study || "",
    word_count: p.word_count || 0,
    citation_style: p.citation_style || "",
    language_style: p.language_style || "",
    research_methodology: (p.research_methodology as any) || "Quantitative",
    data_collection_method: p.data_collection_method || "",
    sampling_technique: p.sampling_technique || "",
    sample_size: p.sample_size || 0,
    research_objectives: (p.research_objectives as string[]) || [],
    research_questions: (p.research_questions as string[]) || [],
    research_framework: p.research_framework || "",
    framework_justification: p.framework_justification || "",
    writing_mode: ((p as any).writing_mode as "natural" | "default") || "default",
    language_level: (p as any).language_level ?? 4,
    include_hypotheses: !!(p as any).include_hypotheses,
    created_date: p.created_at,
    chapters: (chapters || [])
      .filter((c) => c.project_id === p.id)
      .map((c) => ({
        id: c.id,
        order_index: c.order_index,
        title: c.title,
        type: c.type,
        content: c.content || "",
        status: c.status as "pending" | "completed",
        word_count_target: c.word_count_target || 0,
        word_count_actual: c.word_count_actual || 0,
        draft_config: c.draft_config as any,
      })),
  }));
}

export async function createProject(userId: string, project: Project): Promise<void> {
  const { error: projError } = await supabase.from("projects").insert({
    id: project.id,
    user_id: userId,
    title: project.title,
    university: project.university,
    degree: project.degree,
    field_of_study: project.field_of_study,
    word_count: project.word_count,
    citation_style: project.citation_style,
    language_style: project.language_style,
    research_methodology: project.research_methodology,
    data_collection_method: project.data_collection_method,
    sampling_technique: project.sampling_technique,
    sample_size: project.sample_size,
    research_objectives: project.research_objectives as any,
    research_questions: project.research_questions as any,
    research_framework: project.research_framework,
    framework_justification: project.framework_justification,
    writing_mode: project.writing_mode || "default",
    language_level: project.language_level ?? 4,
    include_hypotheses: !!project.include_hypotheses,
  } as any);
  if (projError) throw projError;

  if (project.chapters.length > 0) {
    const { error: chapError } = await supabase.from("chapters").insert(
      project.chapters.map((c) => ({
        id: c.id,
        project_id: project.id,
        user_id: userId,
        order_index: c.order_index,
        title: c.title,
        type: c.type,
        content: c.content,
        status: c.status,
        word_count_target: c.word_count_target,
        word_count_actual: c.word_count_actual,
        draft_config: c.draft_config as any,
      }))
    );
    if (chapError) throw chapError;
  }
}

export async function updateProject(userId: string, project: Project): Promise<void> {
  const { error: projError } = await supabase
    .from("projects")
    .update({
      title: project.title,
      university: project.university,
      degree: project.degree,
      field_of_study: project.field_of_study,
      word_count: project.word_count,
      citation_style: project.citation_style,
      language_style: project.language_style,
      research_methodology: project.research_methodology,
      data_collection_method: project.data_collection_method,
      sampling_technique: project.sampling_technique,
      sample_size: project.sample_size,
      research_objectives: project.research_objectives as any,
      research_questions: project.research_questions as any,
      research_framework: project.research_framework,
      framework_justification: project.framework_justification,
      include_hypotheses: !!project.include_hypotheses,
    } as any)
    .eq("id", project.id);
  if (projError) throw projError;

  // Batch upsert chapters
  if (project.chapters.length > 0) {
    const { error } = await supabase.from("chapters").upsert(
      project.chapters.map((c) => ({
        id: c.id,
        project_id: project.id,
        user_id: userId,
        order_index: c.order_index,
        title: c.title,
        type: c.type,
        content: c.content,
        status: c.status,
        word_count_target: c.word_count_target,
        word_count_actual: c.word_count_actual,
        draft_config: c.draft_config as any,
      }))
    );
    if (error) throw error;
  }
}

export async function deleteProject(projectId: string): Promise<void> {
  const { error } = await supabase.from("projects").delete().eq("id", projectId);
  if (error) throw error;
}
