import { Routes, Route } from "react-router-dom"
import AppLayout from "./components/AppLayout"
import Dashboard from "./pages/Dashboard"
import ScanPage from "./pages/ScanPage"
import ProfilesPage from "./pages/ProfilesPage"
import MemoryPage from "./pages/MemoryPage"
import TerminalPage from "./pages/TerminalPage"
import SettingsPage from "./pages/SettingsPage"
import StackBuilder from "./pages/StackBuilder"

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/scan" element={<ScanPage />} />
        <Route path="/profiles" element={<ProfilesPage />} />
        <Route path="/memory" element={<MemoryPage />} />
        <Route path="/terminal" element={<TerminalPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/builder" element={<StackBuilder />} />
      </Route>
    </Routes>
  )
}
