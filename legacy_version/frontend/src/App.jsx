import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import CampaignPlanner from './pages/CampaignPlanner'
import ContentStudio from './pages/ContentStudio'
import EmailBuilder from './pages/EmailBuilder'
import WhatsAppCrafter from './pages/WhatsAppCrafter'
import Settings from './pages/Settings'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="campaign" element={<CampaignPlanner />} />
          <Route path="content" element={<ContentStudio />} />
          <Route path="email" element={<EmailBuilder />} />
          <Route path="whatsapp" element={<WhatsAppCrafter />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
