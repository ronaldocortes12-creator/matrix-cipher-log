import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Welcome1 from "./pages/Welcome1";
import Welcome2 from "./pages/Welcome2";
import Welcome3 from "./pages/Welcome3";
import Welcome4 from "./pages/Welcome4";
import Welcome5 from "./pages/Welcome5";
import Chat from "./pages/Chat";
import Dashboard from "./pages/Dashboard";
import Market from "./pages/Market";
import Community from "./pages/Community";
import LanguageSelection from "./pages/LanguageSelection";
import SetPassword from "./pages/SetPassword";
import AccessExpired from "./pages/AccessExpired";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/set-password" element={<SetPassword />} />
            <Route path="/access-expired" element={<AccessExpired />} />
            <Route path="/language-selection" element={
              <ProtectedRoute requireSubscription={false}>
                <LanguageSelection />
              </ProtectedRoute>
            } />
            <Route path="/welcome/1" element={
              <ProtectedRoute requireSubscription={false}>
                <Welcome1 />
              </ProtectedRoute>
            } />
            <Route path="/welcome/2" element={
              <ProtectedRoute requireSubscription={false}>
                <Welcome2 />
              </ProtectedRoute>
            } />
            <Route path="/welcome/3" element={
              <ProtectedRoute requireSubscription={false}>
                <Welcome3 />
              </ProtectedRoute>
            } />
            <Route path="/welcome/4" element={
              <ProtectedRoute requireSubscription={false}>
                <Welcome4 />
              </ProtectedRoute>
            } />
            <Route path="/welcome/5" element={
              <ProtectedRoute requireSubscription={false}>
                <Welcome5 />
              </ProtectedRoute>
            } />
            <Route path="/chat" element={
              <ProtectedRoute>
                <Chat />
              </ProtectedRoute>
            } />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/market" element={
              <ProtectedRoute>
                <Market />
              </ProtectedRoute>
            } />
            <Route path="/community" element={
              <ProtectedRoute>
                <Community />
              </ProtectedRoute>
            } />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
