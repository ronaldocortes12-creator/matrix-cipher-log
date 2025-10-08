import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Welcome1 from "./pages/Welcome1";
import Welcome2 from "./pages/Welcome2";
import Welcome3 from "./pages/Welcome3";
import Welcome4 from "./pages/Welcome4";
import Welcome5 from "./pages/Welcome5";
import Chat from "./pages/Chat";
import Dashboard from "./pages/Dashboard";
import Market from "./pages/Market";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/welcome/1" element={<Welcome1 />} />
          <Route path="/welcome/2" element={<Welcome2 />} />
          <Route path="/welcome/3" element={<Welcome3 />} />
          <Route path="/welcome/4" element={<Welcome4 />} />
          <Route path="/welcome/5" element={<Welcome5 />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/market" element={<Market />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
