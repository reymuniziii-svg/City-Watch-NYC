import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import AddressSearch from './components/AddressSearch';
import MemberList from './components/MemberList';
import MemberDashboard from './components/MemberDashboard';
import BillList from './components/BillList';
import HearingList from './components/HearingList';
import DistrictsPage from './components/DistrictsPage';
import MoneyPage from './components/MoneyPage';

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
        </Routes>
      </Layout>
    </Router>
  );
}
