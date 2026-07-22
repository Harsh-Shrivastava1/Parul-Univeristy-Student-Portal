import { api } from '../lib/apiClient';

export interface DepartmentOption {
  id: string;
  name: string;
}

export const departmentService = {
  /** Reads the Admin-owned departments collection (read-only for the Student Portal). */
  getDepartments: async (): Promise<DepartmentOption[]> => {
    return api.get<DepartmentOption[]>('/departments');
  },
};

export interface InstituteOption {
  code: string;
  departments: string[];
}

export const instituteService = {
  /**
   * Admin-owned institute → academic-department master data (39 institutes),
   * used by the signup cascading dropdowns. Read-only.
   */
  getInstitutes: async (): Promise<InstituteOption[]> => {
    return api.get<InstituteOption[]>('/institutes');
  },
};
