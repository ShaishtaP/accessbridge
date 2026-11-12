import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { AuthProvider } from './context/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import RequireAuth from './components/RequireAuth.jsx';
import Workspaces from './pages/Workspaces.jsx';
import WorkspaceDetail from './pages/WorkspaceDetail.jsx';
import Issues from './pages/Issues.jsx';
import IssueDetail from './pages/IssueDetail.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<RequireAuth><Workspaces /></RequireAuth>} />
            <Route path="workspaces/:id" element={<RequireAuth><WorkspaceDetail /></RequireAuth>} />
            <Route path="workspaces/:id/issues" element={<RequireAuth><Issues /></RequireAuth>} />
            <Route path="workspaces/:id/issues/:issueId" element={<RequireAuth><IssueDetail /></RequireAuth>} />
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
