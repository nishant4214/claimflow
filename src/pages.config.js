/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import ADIntegrationDocs from './pages/ADIntegrationDocs';
import AdminCategories from './pages/AdminCategories';
import AdminRooms from './pages/AdminRooms';
import Approvals from './pages/Approvals';
import BookRoom from './pages/BookRoom';
import BulkUpload from './pages/BulkUpload';
import ClaimDetails from './pages/ClaimDetails';
import Dashboard from './pages/Dashboard';
import DemoCredentials from './pages/DemoCredentials';
import Finance from './pages/Finance';
import HousekeepingDashboard from './pages/HousekeepingDashboard';
import MyClaims from './pages/MyClaims';
import MyRoomBookings from './pages/MyRoomBookings';
import Notifications from './pages/Notifications';
import Reports from './pages/Reports';
import RoomAnalytics from './pages/RoomAnalytics';
import RoomBookingApprovals from './pages/RoomBookingApprovals';
import SubmitClaim from './pages/SubmitClaim';
import TestCredentials from './pages/TestCredentials';
import UserManagement from './pages/UserManagement';
import WorkflowConfig from './pages/WorkflowConfig';
import ConferenceRooms from './pages/ConferenceRooms';
import RoomBookingDetails from './pages/RoomBookingDetails';
import __Layout from './Layout.jsx';


export const PAGES = {
    "ADIntegrationDocs": ADIntegrationDocs,
    "AdminCategories": AdminCategories,
    "AdminRooms": AdminRooms,
    "Approvals": Approvals,
    "BookRoom": BookRoom,
    "BulkUpload": BulkUpload,
    "ClaimDetails": ClaimDetails,
    "Dashboard": Dashboard,
    "DemoCredentials": DemoCredentials,
    "Finance": Finance,
    "HousekeepingDashboard": HousekeepingDashboard,
    "MyClaims": MyClaims,
    "MyRoomBookings": MyRoomBookings,
    "Notifications": Notifications,
    "Reports": Reports,
    "RoomAnalytics": RoomAnalytics,
    "RoomBookingApprovals": RoomBookingApprovals,
    "SubmitClaim": SubmitClaim,
    "TestCredentials": TestCredentials,
    "UserManagement": UserManagement,
    "WorkflowConfig": WorkflowConfig,
    "ConferenceRooms": ConferenceRooms,
    "RoomBookingDetails": RoomBookingDetails,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};