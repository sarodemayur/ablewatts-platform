import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useAppVersion } from "../context/AppVersionContext";
import { ResetIcon } from "./icons";
import logoMark from "../assets/logo-mark.png";

import dashboardIcon from "../assets/nav-icons/dashboard.png";
import databaseIcon from "../assets/nav-icons/database.png";
import sortByAttributesIcon from "../assets/nav-icons/sort-by-attributes.png";
import inputDataIcon from "../assets/nav-icons/input-data.png";
import uploadIcon from "../assets/nav-icons/upload.png";
import rateEngineMonthlyIcon from "../assets/nav-icons/rate-engine-monthly.png";
import rateEngineDailyIcon from "../assets/nav-icons/rate-engine-daily.png";
import keyIcon from "../assets/nav-icons/key.png";
import logoutIcon from "../assets/nav-icons/logout.png";
import addUserIcon from "../assets/nav-icons/add-user.png";
import inviteIcon from "../assets/nav-icons/invite.png";
import surveyIcon from "../assets/nav-icons/survey.png";
import feedbackIcon from "../assets/nav-icons/feedback.png";
import landingPageIcon from "../assets/nav-icons/landing-page.png";

interface NavItem {
  to: string;
  label: string;
  icon: string;
  end?: boolean;
}

const VENUS_NAV: NavItem[] = [
  { to: "/", label: "Super Admin Dashboard", icon: dashboardIcon, end: true },
  { to: "/urdb-rates", label: "Utility Rate Database", icon: databaseIcon },
  { to: "/other-attributes", label: "Other Attributes", icon: sortByAttributesIcon },
  { to: "/lookups", label: "Lookups", icon: inputDataIcon },
  { to: "/green-data", label: "Green Data", icon: uploadIcon },
  { to: "/rate-engine/monthly", label: "Rate Engine ( Monthly )", icon: rateEngineMonthlyIcon },
  { to: "/rate-engine/daily", label: "Rate Engine ( Daily )", icon: rateEngineDailyIcon },
];

const MERCURY_NAV: NavItem[] = [
  { to: "/", label: "Dashboard", icon: dashboardIcon, end: true },
  { to: "/admin-users", label: "Admin Users", icon: addUserIcon },
  { to: "/app-users", label: "End Users", icon: inviteIcon },
  { to: "/surveys", label: "Surveys", icon: surveyIcon },
  { to: "/feedback", label: "Feedback", icon: feedbackIcon },
  { to: "/homepage-content", label: "Homepage Content", icon: landingPageIcon },
];

const COMMON_NAV: NavItem[] = [{ to: "/change-password", label: "Change Password", icon: keyIcon }];

export function Layout() {
  const { admin, logout } = useAuth();
  const { version, switchVersion } = useAppVersion();

  const navItems = version === "venus" ? VENUS_NAV : MERCURY_NAV;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <img src={logoMark} alt="AbleWatts" />
        </div>

        <div className="version-block">
          <span className="version-planet" />
          <div className="version-text">
            <div className="version-name">{version === "venus" ? "Venus" : "Mercury"}</div>
            <button type="button" className="version-switch" onClick={switchVersion}>
              <ResetIcon size={12} /> Switch Version
            </button>
            <div className="version-local">Local Version - 3.4</div>
          </div>
        </div>

        <nav>
          <div className="nav-section">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
                <img src={item.icon} alt="" className="nav-icon" />
                {item.label}
              </NavLink>
            ))}
          </div>
          <div className="nav-section">
            {COMMON_NAV.map((item) => (
              <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
                <img src={item.icon} alt="" className="nav-icon" />
                {item.label}
              </NavLink>
            ))}
            <button type="button" className="nav-link nav-link-button" onClick={logout}>
              <img src={logoutIcon} alt="" className="nav-icon" />
              Logout
            </button>
          </div>
        </nav>

        <div className="sidebar-footer">
          <div>© AbleWatts Inc 2026</div>
          <div>Powered by: AbleWatts Inc</div>
        </div>
        <div className="sidebar-username">Username: {admin?.username}</div>
      </aside>
      <div className="main-column">
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
