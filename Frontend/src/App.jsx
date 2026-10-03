import './App.css'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import useAuth from './hooks/useAuth'
import Shell from './components/Layout/Shell'
import Dashboard from './pages/Dashboard'
import LoginPage from './pages/LoginPage'
import NewFunnel from './pages/NewFunnel'
import FunnelEditor from './pages/FunnelEditor'
import PublicFunnel from './pages/PublicFunnel'
import CampaignList from './pages/CampaignList'
import CampaignCreate from './pages/CampaignCreate'
import CampaignDetail from './pages/CampaignDetail'
import TemplateList from './pages/TemplateList'
import TemplateEditor from './pages/TemplateEditor'
import Topup from './pages/Topup'
import Help from './pages/Help'

function App() {
  const auth = useAuth()
  return (
    <BrowserRouter>
      <Shell auth={auth}>
        <Routes>
          <Route path="/" element={<Dashboard auth={auth} />} />
          <Route path="/login" element={<LoginPage auth={auth} />} />
          <Route path="/new" element={<NewFunnel auth={auth} />} />
          <Route path="/edit/:id" element={<FunnelEditor auth={auth} />} />
          <Route path="/topup" element={<Topup auth={auth} />} />
          <Route path="/help" element={<Help />} />
          <Route path="/campaigns" element={<CampaignList auth={auth} />} />
          <Route path="/campaigns/new" element={<CampaignCreate auth={auth} />} />
          <Route path="/campaigns/:id" element={<CampaignDetail auth={auth} />} />
          <Route path="/templates" element={<TemplateList auth={auth} />} />
          <Route path="/templates/new" element={<TemplateEditor auth={auth} />} />
          <Route path="/templates/:id" element={<TemplateEditor auth={auth} />} />
          <Route path="/p/:slug" element={<PublicFunnel />} />
        </Routes>
      </Shell>
    </BrowserRouter>
  )
}

export default App
