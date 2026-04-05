import { Route, Routes } from 'react-router-dom'
import { StarField } from '@/components/StarField'
import { LaunchList } from '@/components/LaunchList'
import { LaunchDetailScreen } from '@/components/LaunchDetailScreen'

export default function App() {
  return (
    <div className="min-h-screen bg-background text-foreground relative">
      <StarField />
      <Routes>
        <Route path="/" element={<LaunchList />} />
        <Route path="/launches/:launchId" element={<LaunchDetailScreen />} />
      </Routes>
    </div>
  )
}
