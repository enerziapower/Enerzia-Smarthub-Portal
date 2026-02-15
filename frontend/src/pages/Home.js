import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Dashboard from './Dashboard';

const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    // Super admin or Projects department users stay on Projects Dashboard
    if (user.role === 'super_admin' || user.department === 'PROJECTS') {
      return; // Stay on current page (Projects Dashboard)
    }

    // Redirect other department users to their own dashboard
    const departmentRoutes = {
      'ACCOUNTS': '/accounts',
      'SALES': '/sales',
      'PURCHASE': '/purchase',
      'EXPORTS': '/exports',
      'FINANCE': '/finance',
      'HR': '/hr',
      'OPERATIONS': '/operations',
    };

    const route = departmentRoutes[user.department];
    if (route) {
      navigate(route, { replace: true });
    }
  }, [user, navigate]);

  // Show Projects Dashboard for super_admin and PROJECTS users
  return <Dashboard />;
};

export default Home;
