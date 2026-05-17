import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { NewProject } from "@/components/firstdraft/NewProject";
import { useAuth } from "@/contexts/AuthContext";
import { createProject } from "@/lib/projectService";
import { type Project } from "@/types/project";

export default function NewProjectPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

    // Auth guard handled by ProtectedRoute

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

  if (loading || !user) {
    return <div className="min-h-screen bg-background" />;
  }

  return <NewProject onBack={() => navigate("/dashboard")} onCreate={handleCreate} />;
}
