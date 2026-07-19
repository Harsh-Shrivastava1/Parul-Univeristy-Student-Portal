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
