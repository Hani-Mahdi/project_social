import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import type { ReactNode } from "react";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Upload from "./pages/Upload";
import Library from "./pages/Library";
import PostBuilder from "./pages/PostBuilder";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import Settings from "./pages/Settings";
import YouTubeCallback from "./pages/YouTubeCallback";
import Analytics from "./pages/Analytics";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ErrorBoundary } from "./components/ErrorBoundary";

const queryClient = new QueryClient();

const ProtectedPage = ({ children }: { children: ReactNode }) => (
  <ProtectedRoute>
    <ErrorBoundary>{children}</ErrorBoundary>
  </ProtectedRoute>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/dashboard" element={<ProtectedPage><Dashboard /></ProtectedPage>} />
          <Route path="/dashboard/upload" element={<ProtectedPage><Upload /></ProtectedPage>} />
          <Route path="/dashboard/library" element={<ProtectedPage><Library /></ProtectedPage>} />
          <Route path="/dashboard/post" element={<ProtectedPage><PostBuilder /></ProtectedPage>} />
          <Route path="/dashboard/analytics" element={<ProtectedPage><Analytics /></ProtectedPage>} />
          <Route path="/dashboard/settings" element={<ProtectedPage><Settings /></ProtectedPage>} />
          <Route path="/auth/youtube/callback" element={<YouTubeCallback />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
