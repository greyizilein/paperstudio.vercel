import { lazy, Suspense } from "react";
import { useSiteContent } from "@/hooks/useSiteContent";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { PsThemeProvider } from "@/contexts/PsThemeContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { BookLoader } from "@/components/ui/BookLoader";

// Eager — landing page must paint instantly
import Index from "./pages/Index.tsx";
import { SiteLayout } from "./components/firstdraft/SiteLayout.tsx";

// Auth screens — small, kept eager so login/reset feel snappy
import Auth from "./pages/Auth.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import NotFound from "./pages/NotFound.tsx";
import ReferralLanding from "./pages/ReferralLanding.tsx";

// Public share view — lazy so it only loads when visiting a share link
const ShareView = lazy(() => import("./pages/ShareView.tsx"));

// Heavy authenticated app — lazy-loaded so the homepage bundle stays tiny
const Dashboard = lazy(() => import("./pages/Dashboard.tsx"));
const WriterPage = lazy(() => import("./pages/Writer.tsx"));
const Czar = lazy(() => import("./pages/Czar.tsx"));
const CzarEditor = lazy(() => import("./pages/CzarEditor.tsx"));
const NewProjectPage = lazy(() => import("./pages/NewProjectPage.tsx"));
const SettingsPage = lazy(() => import("./pages/Settings.tsx"));
const AdminPage = lazy(() => import("./pages/Admin.tsx"));
const PaymentCallback = lazy(() => import("./pages/PaymentCallback.tsx"));

// Marketing / informational pages — lazy so they only load when visited
const Features = lazy(() => import("./pages/Features.tsx"));
const HowItWorks = lazy(() => import("./pages/HowItWorks.tsx"));
const PricingPage = lazy(() => import("./pages/Pricing.tsx"));
const ResearchTools = lazy(() => import("./pages/ResearchTools.tsx"));
const AnalysisPage = lazy(() => import("./pages/Analysis.tsx"));
const CitationsPage = lazy(() => import("./pages/Citations.tsx"));
const ExportPage = lazy(() => import("./pages/Export.tsx"));
const HowToUsePage = lazy(() => import("./pages/HowToUse.tsx"));
const HelpPage = lazy(() => import("./pages/Help.tsx"));
const StudentGuidePage = lazy(() => import("./pages/StudentGuide.tsx"));
const UniversitiesPage = lazy(() => import("./pages/Universities.tsx"));
const ChangelogPage = lazy(() => import("./pages/Changelog.tsx"));
const PrivacyPage = lazy(() => import("./pages/Privacy.tsx"));
const TermsPage = lazy(() => import("./pages/Terms.tsx"));
const IntegrityPage = lazy(() => import("./pages/Integrity.tsx"));
const CookiesPage = lazy(() => import("./pages/Cookies.tsx"));
const ContactPage = lazy(() => import("./pages/Contact.tsx"));

const queryClient = new QueryClient();

const RouteFallback = () => <BookLoader fullScreen />;

function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const maintenanceContent = useSiteContent<{ active: boolean; message: string }>(
    "global", "maintenance_mode", { active: false, message: "We're upgrading PaperStudio. Back shortly." }
  );
  if (maintenanceContent.active) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-background text-foreground z-[9999] gap-4 p-8 text-center">
        <div className="text-4xl">🔧</div>
        <h1 className="text-2xl font-bold">Down for maintenance</h1>
        <p className="text-muted-foreground max-w-sm">{maintenanceContent.message}</p>
      </div>
    );
  }
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <PsThemeProvider>
          <BrowserRouter>
            <MaintenanceGate>
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/ref/:code" element={<ReferralLanding />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/payment/callback" element={<PaymentCallback />} />
                <Route path="/share/:token" element={<ShareView />} />
                {/* Protected routes */}
                <Route element={<ProtectedRoute />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/new-project" element={<NewProjectPage />} />
                  <Route path="/writer/:projectId" element={<WriterPage />} />
                  <Route path="/czar" element={<CzarEditor />} />
                  <Route path="/czar-ai" element={<Czar />} />
                  <Route path="/editor" element={<CzarEditor />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/admin" element={<AdminPage />} />
                </Route>
                <Route element={<SiteLayout />}>
                  <Route path="/features" element={<Features />} />
                  <Route path="/how-it-works" element={<HowItWorks />} />
                  <Route path="/pricing" element={<PricingPage />} />
                  <Route path="/research-tools" element={<ResearchTools />} />
                  <Route path="/analysis" element={<AnalysisPage />} />
                  <Route path="/citations" element={<CitationsPage />} />
                  <Route path="/export" element={<ExportPage />} />
                  <Route path="/how-to-use" element={<HowToUsePage />} />
                  <Route path="/help" element={<HelpPage />} />
                  <Route path="/student-guide" element={<StudentGuidePage />} />
                  <Route path="/universities" element={<UniversitiesPage />} />
                  <Route path="/changelog" element={<ChangelogPage />} />
                  <Route path="/privacy" element={<PrivacyPage />} />
                  <Route path="/terms" element={<TermsPage />} />
                  <Route path="/integrity" element={<IntegrityPage />} />
                  <Route path="/cookies" element={<CookiesPage />} />
                  <Route path="/contact" element={<ContactPage />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
            </MaintenanceGate>
          </BrowserRouter>
        </PsThemeProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
