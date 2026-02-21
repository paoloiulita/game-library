import BarChartIcon from '@mui/icons-material/BarChart';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import DashboardIcon from '@mui/icons-material/Dashboard';
import LogoutIcon from '@mui/icons-material/Logout';
import SettingsIcon from '@mui/icons-material/Settings';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import StoreIcon from '@mui/icons-material/Store';
import {
  AppBar,
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import { type ReactElement, type ReactNode, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

import { useAppContext } from '../../context/AppContext';
import SetupModal from '../Setup/SetupModal';

const DRAWER_WIDTH = 220;

interface NavItem {
  label: string;
  path: string;
  icon: ReactElement;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: <DashboardIcon /> },
  { label: 'Games', path: '/games', icon: <SportsEsportsIcon /> },
  { label: 'Wishlist', path: '/wishlist', icon: <BookmarkIcon /> },
  { label: 'Stores', path: '/stores', icon: <StoreIcon /> },
  { label: 'Statistics', path: '/statistics', icon: <BarChartIcon /> },
];

interface AppLayoutProps {
  children: ReactNode;
}

function AppLayout({ children }: AppLayoutProps) {
  const { signOut } = useAppContext();
  const { pathname } = useLocation();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
          },
        }}
      >
        <Toolbar>
          <Typography variant="h6" noWrap fontWeight={700}>
            Game Library
          </Typography>
        </Toolbar>
        <Divider />
        <List>
          {NAV_ITEMS.map(({ label, path, icon }) => (
            <ListItem key={path} disablePadding>
              <ListItemButton
                component={NavLink}
                to={path}
                selected={pathname === path}
              >
                <ListItemIcon>{icon}</ListItemIcon>
                <ListItemText primary={label} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Drawer>

      {/* Main content area */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <AppBar
          position="static"
          color="default"
          elevation={1}
          sx={{ zIndex: (theme) => theme.zIndex.drawer - 1 }}
        >
          <Toolbar>
            <Typography variant="h6" sx={{ flexGrow: 1 }} />
            <Tooltip title="Settings">
              <IconButton onClick={() => setSettingsOpen(true)}>
                <SettingsIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Sign out">
              <IconButton onClick={signOut}>
                <LogoutIcon />
              </IconButton>
            </Tooltip>
          </Toolbar>
        </AppBar>

        <Box component="main" sx={{ flexGrow: 1, p: 3, overflow: 'auto' }}>
          {children}
        </Box>
      </Box>

      {settingsOpen && (
        <SetupModal />
      )}
    </Box>
  );
}

export default AppLayout;
