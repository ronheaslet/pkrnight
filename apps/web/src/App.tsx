import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";
import Home from "./pages/Home";
import GameLayout from "./pages/GameLayout";
import DealerPage from "./pages/DealerPage";
import ScannerPage from "./pages/ScannerPage";
import Login from "./components/auth/Login";
import ClubHub from "./pages/ClubHub";
import MemberList from "./pages/MemberList";
import ClubSettings from "./pages/ClubSettings";
import ClubSelect from "./pages/ClubSelect";
import Placeholder from "./pages/Placeholder";
import AppLayout from "./components/layout/AppLayout";
import Inbox from "./pages/Inbox";
import Chat from "./pages/Chat";
import Network from "./pages/Network";
import GameClose from "./pages/GameClose";
import GameResults from "./pages/GameResults";
import Standings from "./pages/Standings";
import TrophyWall from "./pages/TrophyWall";
import EventCreate from "./pages/EventCreate";
import EventDetail from "./pages/EventDetail";
import GuestRsvp from "./pages/GuestRsvp";
import Calendar from "./pages/Calendar";
import HandRankings from "./pages/HandRankings";
import PotOddsCalculator from "./pages/PotOddsCalculator";
import Playbook from "./pages/Playbook";
import FeatureGate from "./components/common/FeatureGate";
import HoldemLobby from "./pages/HoldemLobby";
import HoldemGame from "./pages/HoldemGame";
import AccountingLayout from "./pages/accounting/AccountingLayout";
import AccountingIndex from "./pages/accounting/AccountingIndex";
import Settlement from "./pages/accounting/Settlement";
import Dues from "./pages/accounting/Dues";
import Treasury from "./pages/accounting/Treasury";
import PlayerBalances from "./pages/accounting/PlayerBalances";
import Reports from "./pages/accounting/Reports";
import AuditLog from "./pages/accounting/AuditLog";
import PubPokerGate from "./components/common/PubPokerGate";
import SuperAdminGate from "./components/common/SuperAdminGate";
import CheckIn from "./pages/pubpoker/CheckIn";
import TableManager from "./pages/pubpoker/TableManager";
// CircuitStandings from pubpoker is replaced by CircuitHub in Phase 11
import WalkInClaim from "./pages/pubpoker/WalkInClaim";
import VenueDiscovery from "./pages/pubpoker/VenueDiscovery";
import SuperLayout from "./pages/super/SuperLayout";
import SuperDashboard from "./pages/super/SuperDashboard";
import ClubsOverview from "./pages/super/ClubsOverview";
import ErrorFeed from "./pages/super/ErrorFeed";
import AiUsage from "./pages/super/AiUsage";
import GrowthStats from "./pages/super/GrowthStats";
import FeatureFlags from "./pages/super/FeatureFlags";
import KillSwitch from "./pages/super/KillSwitch";
import ClubPublicPage from "./pages/public/ClubPublicPage";
import CircuitPublicPage from "./pages/public/CircuitPublicPage";
import JoinPage from "./pages/public/JoinPage";
import ClubQRPage from "./pages/admin/ClubQRPage";
import CircuitHub from "./pages/circuit/CircuitHub";
import CircuitManage from "./pages/circuit/CircuitManage";

function App() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    setIsOnline(navigator.onLine);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <BrowserRouter>
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 bg-red-600 text-white text-center py-2 text-sm font-medium z-50">
          You're offline — live features may not work.
        </div>
      )}
      <Routes>
        {/* Public pages — no auth required */}
        <Route path="/c/:clubSlug" element={<ClubPublicPage />} />
        <Route path="/circuit/:slug" element={<CircuitPublicPage />} />
        <Route path="/join" element={<JoinPage />} />

        {/* No bottom nav */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/select-club" element={<ClubSelect />} />
        <Route path="/game/:gameId/dealer" element={<ErrorBoundary><DealerPage /></ErrorBoundary>} />
        <Route path="/game/:gameId/scan" element={<ErrorBoundary><ScannerPage /></ErrorBoundary>} />
        <Route path="/rsvp/guest/:guestToken" element={<GuestRsvp />} />
        <Route path="/claim/:claimToken" element={<WalkInClaim />} />
        <Route path="/venues" element={<VenueDiscovery />} />
        <Route path="/clubs/:clubId/holdem/game" element={<HoldemGame />} />

        {/* With bottom nav */}
        <Route element={<AppLayout />}>
          <Route path="/clubs/:clubId" element={<ClubHub />} />
          <Route path="/inbox" element={<Inbox />} />
          <Route path="/network" element={<Network />} />
          <Route path="/clubs/:clubId/members" element={<MemberList />} />
          <Route path="/clubs/:clubId/settings" element={<ClubSettings />} />
          <Route path="/clubs/:clubId/qr" element={<ClubQRPage />} />
          <Route path="/clubs/:clubId/calendar" element={<Calendar />} />
          <Route path="/clubs/:clubId/standings" element={<Standings />} />
          <Route path="/clubs/:clubId/trophies" element={<TrophyWall />} />
          <Route path="/clubs/:clubId/chat" element={<Chat />} />
          <Route
            path="/clubs/:clubId/hand-rankings"
            element={
              <FeatureGate featureKey="hand_rankings" fallback={<Placeholder title="Feature not available" />}>
                <HandRankings />
              </FeatureGate>
            }
          />
          <Route
            path="/clubs/:clubId/pot-odds"
            element={
              <FeatureGate featureKey="pot_odds_calculator" fallback={<Placeholder title="Feature not available" />}>
                <PotOddsCalculator />
              </FeatureGate>
            }
          />
          <Route
            path="/clubs/:clubId/holdem"
            element={
              <FeatureGate featureKey="in_app_holdem" fallback={<Placeholder title="Feature not available" />}>
                <HoldemLobby />
              </FeatureGate>
            }
          />
          <Route
            path="/clubs/:clubId/playbook"
            element={
              <FeatureGate featureKey="playbook" fallback={<Placeholder title="Feature not available" />}>
                <Playbook />
              </FeatureGate>
            }
          />
          <Route
            path="/clubs/:clubId/checkin"
            element={
              <PubPokerGate>
                <CheckIn />
              </PubPokerGate>
            }
          />
          <Route
            path="/clubs/:clubId/tables"
            element={
              <PubPokerGate>
                <TableManager />
              </PubPokerGate>
            }
          />
          <Route path="/circuits/:circuitId" element={<ErrorBoundary><CircuitHub /></ErrorBoundary>} />
          <Route path="/circuits/:circuitId/manage" element={<ErrorBoundary><CircuitManage /></ErrorBoundary>} />
          <Route path="/clubs/:clubId/accounting" element={<ErrorBoundary><AccountingLayout /></ErrorBoundary>}>
            <Route index element={<AccountingIndex />} />
            <Route path="settlement" element={<Settlement />} />
            <Route path="dues" element={<Dues />} />
            <Route path="treasury" element={<Treasury />} />
            <Route path="balances" element={<PlayerBalances />} />
            <Route path="reports" element={<Reports />} />
            <Route path="audit" element={<AuditLog />} />
          </Route>
          <Route path="/events/create" element={<EventCreate />} />
          <Route path="/events/:eventId" element={<EventDetail />} />
          <Route path="/events/:eventId/edit" element={<EventCreate />} />
          <Route path="/game/:gameId" element={<ErrorBoundary><GameLayout /></ErrorBoundary>} />
          <Route path="/game/:gameId/close" element={<ErrorBoundary><GameClose /></ErrorBoundary>} />
          <Route path="/results/games/:gameId" element={<ErrorBoundary><GameResults /></ErrorBoundary>} />
        </Route>

        {/* Super Admin — gated, shows 404 to non-super-admins */}
        <Route
          path="/super"
          element={
            <SuperAdminGate>
              <ErrorBoundary>
                <SuperLayout />
              </ErrorBoundary>
            </SuperAdminGate>
          }
        >
          <Route path="dashboard" element={<SuperDashboard />} />
          <Route path="clubs" element={<ClubsOverview />} />
          <Route path="errors" element={<ErrorFeed />} />
          <Route path="ai-usage" element={<AiUsage />} />
          <Route path="growth" element={<GrowthStats />} />
          <Route path="features" element={<FeatureFlags />} />
          <Route path="kill-switch" element={<KillSwitch />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
