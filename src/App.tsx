import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import ProfileSetup from "./pages/ProfileSetup";
import Profile from "./pages/Profile";
import DocumentVault from "./pages/DocumentVault";
import Admin from "./pages/Admin";
import AITools from "./pages/AITools";
import SharedDocumentView from "./pages/SharedDocumentView";
import Pricing from "./pages/Pricing";
import Community from "./pages/Community";
import PublicCommunity from "./pages/PublicCommunity";
import Blog from "./pages/Blog";
import TermsAndConditions from "./pages/TermsAndConditions";
import ResetPassword from "./pages/ResetPassword";
import TwoFactorVerify from "./pages/TwoFactorVerify";
import Support from "./pages/Support";
import NotFound from "./pages/NotFound";
import SharedPost from "./pages/SharedPost";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Home />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/login" element={<Auth />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/taxoverflow" element={<PublicCommunity />} />
            <Route path="/terms" element={<TermsAndConditions />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/2fa-verify" element={<TwoFactorVerify />} />

            {/* Protected user routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/vault" element={
              <ProtectedRoute>
                <DocumentVault />
              </ProtectedRoute>
            } />
            <Route path="/profile-setup" element={<ProfileSetup />} />
            <Route path="/profile" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />
            
            <Route path="/community" element={
              <ProtectedRoute>
                <Community />
              </ProtectedRoute>
            } />
            <Route path="/ai-tools" element={
              <ProtectedRoute>
                <AITools />
              </ProtectedRoute>
            } />
            <Route path="/support" element={
              <ProtectedRoute>
                <Support />
              </ProtectedRoute>
            } />
            
            {/* Protected admin routes */}
            <Route path="/admin" element={
              <ProtectedRoute requiredRole="admin">
                <Admin />
              </ProtectedRoute>
            } />
            
            {/* Public shared document route */}
            <Route path="/shared/:token" element={<SharedDocumentView />} />
            
            {/* Public shared post route */}
            <Route path="/taxoverflow/post/:postId" element={<SharedPost />} />

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
