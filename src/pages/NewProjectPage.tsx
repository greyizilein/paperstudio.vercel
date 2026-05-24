import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { NewProject } from "@/components/firstdraft/NewProject";
import { useAuth } from "@/contexts/AuthContext";
import { createProject, fetchProjects } from "@/lib/projectService";
import { type Project } from "@/types/project";

export default function NewProjectPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const handleCreate = async (project: Project) => {
    if (!user) return;
    try {
      await createProject(user.id, project);
      toast.success("Project created");
      navigate(`/writer/${project.id}`, { replace: true });
    } catch (err: any) {
      toast.error(`Failed to create project: ${err.message}`);
    }
  };

  // Navigate to most recent project if one exists, otherwise home.
  // Never go to /dashboard — it would redirect straight back here.
  const handleBack = useCallback(async () => {
    if (!user) { navigate("/"); return; }
    try {
      const projects = await fetchProjects(user.id);
      if (projects.length > 0) {
        navigate(`/writer/${projects[0].id}`);
      } else {
        navigate("/");
      }
    } catch {
      navigate("/");
    }
  }, [user, navigate]);

  if (loading || !user) {
    return <div className="min-h-screen bg-background" />;
  }

  return <NewProject onBack={handleBack} onCreate={handleCreate} />;
}

