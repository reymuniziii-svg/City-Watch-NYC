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
import NotFoundPage from './components/NotFoundPage';

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<AddressSearch />} />
          <Route path="/members" element={<MemberList />} />
          <Route path="/members/:id" element={<MemberDashboard />} />
          <Route path="/members/district/:district" element={<MemberDashboard />} />
          <Route path="/districts" element={<DistrictsPage />} />
          <Route path="/bills" element={<BillList />} />
          <Route path="/hearings" element={<HearingList />} />
          <Route path="/money" element={<MoneyPage />} />
          <Route path="/influence" element={<InfluenceMapperPage />} />
          <Route path="/watchlist" element={<WatchlistPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/support" element={<SupportPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Layout>
    </Router>
  );
}
