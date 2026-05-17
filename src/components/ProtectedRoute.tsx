import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { BookLoader } from "@/components/ui/BookLoader";
import { FirstLoginSplash } from "@/components/FirstLoginSplash";

export function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <BookLoader fullScreen />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // CZAR owns its own theming surface (`.czar-root`); skip the dark-luxe
  // app shell there to avoid double-skinning.
  const isCzar = location.pathname.startsWith("/czar");

  return (
    <>
      <FirstLoginSplash userId={user.id} />
      {isCzar ? (
        <Outlet />
      ) : (
        <div className="ps-app min-h-screen">
          <Outlet />
        </div>
      )}
    </>
  );
}
