import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';

import TransportRequestDetails from './pages/TransportRequestDetails';
import RoleAccessManagement from './pages/RoleAccessManagement';
import NewClaim from './pages/NewClaim';
import MainClaimDetails from './pages/MainClaimDetails';
import SystemSettings from './pages/SystemSettings';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  // Render the main app
  return (
    <Routes>
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <MainPage />
        </LayoutWrapper>
      } />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}
      <Route
        path="/TransportRequestDetails"
        element={
          <LayoutWrapper currentPageName="TransportRequestDetails">
            <TransportRequestDetails />
          </LayoutWrapper>
        }
      />
      <Route
        path="/claims/new"
        element={
          <LayoutWrapper currentPageName="NewClaim">
            <NewClaim />
          </LayoutWrapper>
        }
      />
      <Route
        path="/RoleAccessManagement"
        element={
          <LayoutWrapper currentPageName="RoleAccessManagement">
            <RoleAccessManagement />
          </LayoutWrapper>
        }
      />
      <Route
        path="/MainClaimDetails"
        element={
          <LayoutWrapper currentPageName="MainClaimDetails">
            <MainClaimDetails />
          </LayoutWrapper>
        }
      />
      <Route
        path="/SystemSettings"
        element={
          <LayoutWrapper currentPageName="SystemSettings">
            <SystemSettings />
          </LayoutWrapper>
        }
      />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <QueryClientProvider client={queryClientInstance}>
      <Router>
        <AuthenticatedApp />
      </Router>
      <Toaster />
    </QueryClientProvider>
  )
}

export default App