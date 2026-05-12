import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { AuthGuard, GuestOnly } from "@/components/AuthGuard";
import { AppLayout } from "@/components/AppLayout";
import Dashboard from "./pages/Dashboard";
import IncomingMail from "./pages/IncomingMail";
import OutgoingMail from "./pages/OutgoingMail";
import InternalMail from "./pages/InternalMail";
import MailTracking from "./pages/MailTracking";
import Statistics from "./pages/Statistics";
import SettingsPage from "./pages/Settings";
import DirectorInbox from "./pages/DirectorInbox";
import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
            <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />
            <Route
              path="*"
              element={
                <AuthGuard>
                  <AppLayout>
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/dispatch" element={<DirectorInbox />} />
                      <Route path="/incoming" element={<IncomingMail />} />
                      <Route path="/outgoing" element={<OutgoingMail />} />
                      <Route path="/internal" element={<InternalMail />} />
                      <Route path="/tracking" element={<MailTracking />} />
                      <Route path="/statistics" element={<Statistics />} />
                      <Route path="/settings" element={<SettingsPage />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </AppLayout>
                </AuthGuard>
              }
            />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
