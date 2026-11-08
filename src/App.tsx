import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { AuthProvider } from "./lib/AuthContext";
import { ToastProvider } from "./components/ToastContext";
import { AdSenseProvider } from "./lib/AdSenseContext";
import { NotificationProvider } from "./lib/NotificationContext";
import { CurrencyProvider } from "./lib/CurrencyContext";
import { HomePageProvider } from "./lib/HomePageContext";
import { ProtectedRoute } from "./components/ProtectedRoute";

import { Layout } from "./components/Layout";
import { AdminLayout } from "./components/AdminLayout";
import { SearchPage } from "./pages/SearchPage";
import { SitterProfilePage } from "./pages/SitterProfilePage";
import { BookSitterPage } from "./pages/BookSitterPage";
import { OrderConfirmationPage } from "./pages/OrderConfirmationPage";
import { MyBookingsPage } from "./pages/MyBookingsPage";
import { ProfilePage } from "./pages/ProfilePage";
import { LiveTrackerPage } from "./pages/LiveTrackerPage";
import { SitterInboxPage } from "./pages/SitterInboxPage";
import { SitterRatesPage } from "./pages/SitterRatesPage";
import { SitterVisitPage } from "./pages/SitterVisitPage";
import { NotificationsPage } from "./pages/NotificationsPage";

import { AdminActivityMonitorPage } from "./pages/AdminActivityMonitorPage";
import { AdminAnalyticsPage } from "./pages/AdminAnalyticsPage";
import { AdminUsersPage } from "./pages/AdminUsersPage";
import { AdminRolesPage } from "./pages/AdminRolesPage";
import { AdminPlatformFeesPage } from "./pages/AdminPlatformFeesPage";
import { AdminAdSensePage } from "./pages/AdminAdSensePage";
import { AdminAuditLogsPage } from "./pages/AdminAuditLogsPage";
import { AdminKrawlPage } from "./pages/AdminKrawlPage";
import { AdminBuyMeCoffeePage } from "./pages/AdminBuyMeCoffeePage";
import { AdminEnvironmentPage } from "./pages/AdminEnvironmentPage";
import { PlatformCoffeePage } from "./pages/PlatformCoffeePage";
import { AdminSitterPaywallPage } from "./pages/AdminSitterPaywallPage";
import { AdminReferralsPage } from "./pages/AdminReferralsPage";
import { AdminGoogleAnalyticsPage } from "./pages/AdminGoogleAnalyticsPage";
import { AdminAIUXResearchPage } from "./pages/AdminAIUXResearchPage";
import { AdminPayoutsPage } from "./pages/AdminPayoutsPage";
import { AdminDatabasePage } from "./pages/AdminDatabasePage";

import { LandingPage } from "./pages/LandingPage";
import { SitterLandingPage } from "./pages/SitterLandingPage";
import { BecomeSitterPage } from "./pages/BecomeSitterPage";
import { AIBugInspectorPage } from "./pages/AIBugInspectorPage";
import { AIAgentStudioPage } from "./pages/AIAgentStudioPage";
import { AdminAIAgentFleetPage } from "./pages/AdminAIAgentFleetPage";
import { AdminHomepageAgentPage } from "./pages/AdminHomepageAgentPage";
import { QATestingPage } from "./pages/QATestingPage";
import { PrivacyPolicyPage } from "./pages/PrivacyPolicyPage";
import { TermsOfServicePage } from "./pages/TermsOfServicePage";
import { AboutUsPage } from "./pages/AboutUsPage";
import { ContactUsPage } from "./pages/ContactUsPage";
import { GuidesKnowledgeHubPage } from "./pages/GuidesKnowledgeHubPage";
import { GuideDetailPage } from "./pages/GuideDetailPage";
import { AdminSitterRatesPage } from "./pages/AdminSitterRatesPage";
import { AdminSearchConsolePage } from "./pages/AdminSearchConsolePage";
import { ReviewsFeedbackCenterPage } from "./pages/ReviewsFeedbackCenterPage";
import { AdminSystemMetricsPage } from "./pages/AdminSystemMetricsPage";
import { AdminOwaspSecurityPage } from "./pages/AdminOwaspSecurityPage";

export default function App() {
  return (
    <AuthProvider>
      <AdSenseProvider>
        <CurrencyProvider>
          <HomePageProvider>
            <NotificationProvider>
              <ToastProvider>
                <BrowserRouter>
                  <Routes>
                    <Route path="/" element={<Layout />}>
                      <Route index element={<LandingPage />} />
                      <Route path="search" element={<SearchPage />} />
                      <Route path="become-a-sitter" element={<BecomeSitterPage />} />
                      <Route path="become-sitter" element={<BecomeSitterPage />} />
                      <Route path="ai-agent" element={<Navigate to="/admin/bugs" replace />} />
                      <Route path="qa-testing" element={<QATestingPage />} />
                      <Route path="sitters/:id" element={<SitterProfilePage />} />
                      
                      {/* Booking Flows */}
                      <Route path="book/:sitterId" element={<BookSitterPage />} />
                      <Route path="bookings/:id/confirmation" element={<OrderConfirmationPage />} />
                      <Route path="bookings/:id/order-summary" element={<OrderConfirmationPage />} />
                      <Route path="bookings/:id/live-tracker" element={<LiveTrackerPage />} />
                      <Route
                        path="my-bookings"
                        element={
                          <ProtectedRoute>
                            <MyBookingsPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="orders"
                        element={
                          <ProtectedRoute>
                            <MyBookingsPage />
                          </ProtectedRoute>
                        }
                      />

                      {/* Protected Member Routes */}
                      <Route
                        path="profile"
                        element={
                          <ProtectedRoute>
                            <ProfilePage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="notifications"
                        element={
                          <ProtectedRoute>
                            <NotificationsPage />
                          </ProtectedRoute>
                        }
                      />
                    
                      {/* Review & Ratings Feedback Center */}
                      <Route
                        path="reviews"
                        element={
                          <ProtectedRoute>
                            <ReviewsFeedbackCenterPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="feedback"
                        element={
                          <ProtectedRoute>
                            <ReviewsFeedbackCenterPage />
                          </ProtectedRoute>
                        }
                      />

                      {/* Public Policy & Compliance Routes */}
                      <Route
                        path="coffee"
                        element={
                          <ProtectedRoute allowedRoles={["ADMIN"]}>
                            <PlatformCoffeePage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="maintenance"
                        element={
                          <ProtectedRoute allowedRoles={["ADMIN"]}>
                            <PlatformCoffeePage />
                          </ProtectedRoute>
                        }
                      />
                      <Route path="privacy" element={<PrivacyPolicyPage />} />
                      <Route path="terms" element={<TermsOfServicePage />} />
                      <Route path="about" element={<AboutUsPage />} />
                      <Route path="contact" element={<ContactUsPage />} />
                      <Route path="guides" element={<GuidesKnowledgeHubPage />} />
                      <Route path="guides/:slug" element={<GuideDetailPage />} />

                      {/* Protected Sitter Routes */}
                      <Route
                        path="sitter"
                        element={<Navigate to="/sitter/dashboard" replace />}
                      />
                      <Route
                        path="sitter/dashboard"
                        element={
                          <ProtectedRoute allowedRoles={["PET_SITTER", "ADMIN"]}>
                            <SitterLandingPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="sitter/rates"
                        element={
                          <ProtectedRoute allowedRoles={["PET_SITTER", "ADMIN"]}>
                            <SitterRatesPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="sitter/inbox"
                        element={
                          <ProtectedRoute allowedRoles={["PET_SITTER", "ADMIN"]}>
                            <SitterLandingPage defaultTab="INBOX" />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="sitter/visits/:bookingId"
                        element={
                          <ProtectedRoute allowedRoles={["PET_SITTER", "ADMIN"]}>
                            <SitterVisitPage />
                          </ProtectedRoute>
                        }
                      />

                      {/* Protected Admin Routes */}
                      <Route
                        path="admin"
                        element={
                          <ProtectedRoute allowedRoles={["ADMIN"]}>
                            <AdminLayout />
                          </ProtectedRoute>
                        }
                      >
                        <Route index element={<Navigate to="activities" replace />} />
                        <Route path="payouts" element={<AdminPayoutsPage />} />
                        <Route path="escrow" element={<AdminPayoutsPage />} />
                        <Route path="coffee" element={<AdminBuyMeCoffeePage />} />
                        <Route path="activities" element={<AdminActivityMonitorPage />} />
                        <Route path="activity-monitor" element={<AdminActivityMonitorPage />} />
                        <Route path="analytics" element={<AdminAnalyticsPage />} />
                        <Route path="users" element={<AdminUsersPage />} />
                        <Route path="roles" element={<AdminRolesPage />} />
                        <Route path="sitter-rates" element={<AdminSitterRatesPage />} />
                        <Route path="sitter-paywall" element={<AdminSitterPaywallPage />} />
                        <Route path="referrals" element={<AdminReferralsPage />} />
                        <Route path="google-analytics" element={<AdminGoogleAnalyticsPage />} />
                        <Route path="search-console" element={<AdminSearchConsolePage />} />
                        <Route path="platform-fees" element={<AdminPlatformFeesPage />} />
                        <Route path="adsense" element={<AdminAdSensePage />} />
                        <Route path="homepage-agent" element={<AdminHomepageAgentPage />} />
                        <Route path="ai-homepage" element={<AdminHomepageAgentPage />} />
                        <Route path="ai-fleet" element={<AdminAIAgentFleetPage />} />
                        <Route path="ai-agents" element={<AdminAIAgentFleetPage />} />
                        <Route path="ai-adsense" element={<AdminAIAgentFleetPage />} />
                        <Route path="ai-planner" element={<AdminAIAgentFleetPage />} />
                        <Route path="ai-ux-research" element={<AdminAIUXResearchPage />} />
                        <Route path="qa-suite" element={<QATestingPage />} />
                        <Route path="ai-qa" element={<AIAgentStudioPage />} />
                        <Route path="qa-studio" element={<AIAgentStudioPage />} />
                        <Route path="database" element={<AdminDatabasePage />} />
                        <Route path="system-metrics" element={<AdminSystemMetricsPage />} />
                        <Route path="process-monitor" element={<AdminSystemMetricsPage />} />
                        <Route path="cpu-memory" element={<AdminSystemMetricsPage />} />
                        <Route path="security-owasp" element={<AdminOwaspSecurityPage />} />
                        <Route path="cyber-security" element={<AdminOwaspSecurityPage />} />
                        <Route path="owasp" element={<AdminOwaspSecurityPage />} />
                        <Route path="environment" element={<AdminEnvironmentPage />} />
                        <Route path="api-keys" element={<AdminEnvironmentPage />} />
                        <Route path="bugs" element={<AIBugInspectorPage />} />
                        <Route path="bug-inspector" element={<AIBugInspectorPage />} />
                        <Route path="krawl" element={<AdminKrawlPage />} />
                        <Route path="audit-logs" element={<AdminAuditLogsPage />} />
                      </Route>
                      
                      {/* Fallback */}
                      <Route path="*" element={<Navigate to="/search" replace />} />
                    </Route>
                  </Routes>
                </BrowserRouter>
              </ToastProvider>
            </NotificationProvider>
          </HomePageProvider>
        </CurrencyProvider>
      </AdSenseProvider>
    </AuthProvider>
  );
}
