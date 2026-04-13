import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import AddressSearch from './components/AddressSearch';
import MemberList from './components/MemberList';
import MemberDashboard from './components/MemberDashboard';
import BillList from './components/BillList';
import HearingList from './components/HearingList';
import DistrictsPage from './components/DistrictsPage';
import MoneyPage from './components/MoneyPage';
import InfluenceMapperPage from './components/InfluenceMapperPage';
import SupportPage from './components/SupportPage';
import PricingPage from './components/PricingPage';
import WatchlistPage from './components/WatchlistPage';
import ImpactAnalysisPage from './components/ImpactAnalysisPage';
import ProDashboard from './components/ProDashboard';
import ActionKitList from './components/ActionKitList';
import ActionKitMicrosite from './components/ActionKitMicrosite';
import HearingSuperSearch from './components/HearingSuperSearch';
import WorkHorseRankingTable from './components/WorkHorseRankingTable';
import StafferDirectoryPage from './components/StafferDirectoryPage';
import BriefPreferencesPage from './components/BriefPreferencesPage';

function AppRoutes() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<AddressSearch />} />
        <Route path="/members" element={<MemberList />} />
        <Route path="/members/:id" element={<MemberDashboard />} />
        <Route path="/members/district/:district" element={<MemberDashboard />} />
        <Route path="/districts" element={<DistrictsPage />} />
        <Route path="/bills" element={<BillList />} />
        <Route path="/hearings" element={<HearingList />} />
        <Route path="/hearing-search" element={<HearingSuperSearch />} />
        <Route path="/money" element={<MoneyPage />} />
        <Route path="/influence" element={<InfluenceMapperPage />} />
        <Route path="/impact" element={<ImpactAnalysisPage />} />
        <Route path="/dashboard" element={<ProDashboard />} />
        <Route path="/watchlist" element={<WatchlistPage />} />
        <Route path="/action-kits" element={<ActionKitList />} />
        <Route path="/workhorse" element={<WorkHorseRankingTable />} />
        <Route path="/staffers" element={<StafferDirectoryPage />} />
        <Route path="/brief" element={<BriefPreferencesPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/support" element={<SupportPage />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/kit/:slug" element={<ActionKitMicrosite />} />
        <Route path="*" element={<AppRoutes />} />
      </Routes>
    </Router>
  );
}
