import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';

// Types
interface Organization {
  id: string;
  name: string;
  description?: string;
  industry?: string;
  logo_url?: string;
}

interface UserOrganization {
  organization_id: string;
  role: string;
  joined_at: string;
  organizations: Organization;
}

interface OrganizationContextType {
  currentOrganization: Organization | null;
  userOrganizations: UserOrganization[];
  setCurrentOrganization: (org: Organization | null) => void;
  isLoading: boolean;
}

// Context
const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

// Provider
interface OrganizationProviderProps {
  children: ReactNode;
}

export const OrganizationProvider: React.FC<OrganizationProviderProps> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  
  // TEMPORARY: Mock organization when auth is disabled
  const mockOrganization: Organization = {
    id: 'demo-org-id',
    name: 'Demo Company',
    description: 'Sample organization for demonstration',
    industry: 'Technology'
  };
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [userOrganizations, setUserOrganizations] = useState<UserOrganization[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Update organizations when user changes
  useEffect(() => {
    if (isAuthenticated && user?.organizations) {
      setUserOrganizations(user.organizations);
      
      // Set current organization from localStorage or first organization
      const savedOrgId = localStorage.getItem('currentOrganizationId');
      let orgToSet: Organization | null = null;
      
      if (savedOrgId) {
        const savedOrg = user.organizations.find(org => org.organization_id === savedOrgId);
        if (savedOrg) {
          orgToSet = savedOrg.organizations;
        }
      }
      
      // Fallback to first organization
      if (!orgToSet && user.organizations.length > 0) {
        orgToSet = user.organizations[0].organizations;
      }
      
      setCurrentOrganization(orgToSet);
      setIsLoading(false);
    } else if (!isAuthenticated) {
      // TEMPORARY: Use mock organization when not authenticated  
      setCurrentOrganization(mockOrganization);
      setUserOrganizations([]);
      setIsLoading(false);
    }
  }, [user, isAuthenticated]);

  // Save current organization to localStorage
  useEffect(() => {
    if (currentOrganization) {
      localStorage.setItem('currentOrganizationId', currentOrganization.id);
    } else {
      localStorage.removeItem('currentOrganizationId');
    }
  }, [currentOrganization]);

  const handleSetCurrentOrganization = (org: Organization | null) => {
    setCurrentOrganization(org);
  };

  const value: OrganizationContextType = {
    currentOrganization,
    userOrganizations,
    setCurrentOrganization: handleSetCurrentOrganization,
    isLoading,
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
};

// Hook
export const useOrganization = (): OrganizationContextType => {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
};
