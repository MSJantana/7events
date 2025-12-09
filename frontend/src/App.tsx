import './App.css'
import { Routes, Route } from 'react-router-dom'
import SevenEventsPage from './pages/SevenEventsPage'
import EventDetails from './pages/EventDetails'
import Login from './pages/Login'

function App() {
  return (
    <Routes>
      <Route path="/" element={<SevenEventsPage />} />
      <Route path="/events/:slug" element={<EventDetails />} />
      <Route path="/login" element={<Login />} />
    </Routes>
  )
}

export default App
