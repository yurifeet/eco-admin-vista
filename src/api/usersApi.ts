import { apiClient, getAuthHeaders } from './apiConfig';

export interface Usuario {
  user_id: string;
  username: string;
  firstname: string;
  lastname: string;
  email: string;
  is_active: string;
  created: string;
  modified: string;
  lognum: string;
}

export interface UsersResponse {
  items: Usuario[];
  search_criteria: {
    filter_groups: any[];
    page_size?: number;
  };
  total_count: number;
}

export interface UsersApiParams {
  searchCriteria?: string;
  pageSize?: number;
  currentPage?: number;
}

export const usersApi = {
  getUsers: async (params: UsersApiParams = {}): Promise<UsersResponse> => {
    try {
      const { searchCriteria = '', pageSize = 10, currentPage = 1 } = params;
      
      const response = await apiClient.get<UsersResponse>('/rest/V1/manus-adminapi/users', {
        params: {
          'searchCriteria[pageSize]': pageSize,
          'searchCriteria[currentPage]': currentPage,
          ...(searchCriteria && { searchCriteria: searchCriteria })
        },
        headers: getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      throw error;
    }
  }
}; 