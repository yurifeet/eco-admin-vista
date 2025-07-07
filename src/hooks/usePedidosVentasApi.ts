import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export const usePedidosVentasApi = () => {
  const { toast } = useToast();
  const { token } = useAuth();  
  const BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/rest/V1/orders`;
  
  const getOrderList = async (
    currentPage: number = 1,
    pageSize: number = 20,
    searchQuery: string = "",
    status: string = "Todos"
  ) => {
    try {
      let endpoint = `${BASE_URL}?searchCriteria[currentPage]=${currentPage}&searchCriteria[pageSize]=${pageSize}`;
      let filterGroupIndex = 0;

      if (searchQuery) {
        endpoint += `&searchCriteria[filterGroups][${filterGroupIndex}][filters][0][field]=increment_id`;
        endpoint += `&searchCriteria[filterGroups][${filterGroupIndex}][filters][0][value]=${encodeURIComponent(`%${searchQuery}%`)}`;
        endpoint += `&searchCriteria[filterGroups][${filterGroupIndex}][filters][0][conditionType]=like`;
        filterGroupIndex++;
      }

      if (status !== "Todos") {
        endpoint += `&searchCriteria[filterGroups][${filterGroupIndex}][filters][0][field]=status`;
        endpoint += `&searchCriteria[filterGroups][${filterGroupIndex}][filters][0][value]=${encodeURIComponent(status)}`;
        endpoint += `&searchCriteria[filterGroups][${filterGroupIndex}][filters][0][conditionType]=eq`;
      }

      endpoint += `&searchCriteria[sortOrders][0][field]=created_at`;
      endpoint += `&searchCriteria[sortOrders][0][direction]=DESC`;

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status === 401) {
        throw new Error('401: Token no válido o expirado');
      }
    
      if (response.status === 400) {
        const errorData = await response.json();
        throw new Error(`400: ${errorData.detail || 'Parámetros inválidos'}`);
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo obtener la lista de pedidos.",
        variant: 'destructive'
      });
      return null;
    }
  };

    const getOrderDetail = async (orderId: number | string) => {
      try {
        const endpoint = `${BASE_URL}?searchCriteria[filterGroups][0][filters][0][field]=entity_id&searchCriteria[filterGroups][0][filters][0][value]=${orderId}&searchCriteria[filterGroups][0][filters][0][conditionType]=eq`;
        
        const response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.status === 401) {
          throw new Error('401: Token no válido o expirado');
        }
      
        if (response.status === 400) {
          const errorData = await response.json();
          throw new Error(`400: ${errorData.detail || 'Parámetros inválidos'}`);
        }
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return data;
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "No se pudo obtener el detalle del pedido.",
          variant: 'destructive'
        });
        return null;
      }
    };

    const cancelOrder = async (orderId: number | string) => {
      try {
        const endpoint = `${BASE_URL}/${orderId}/cancel`;
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.status === 401) {
          throw new Error('401: Token no válido o expirado');
        }
        
        if (response.status === 400) {
          const errorData = await response.json();
          throw new Error(`400: ${errorData.detail || 'Parámetros inválidos'}`);
        }
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        if (response.status === 200) {
          return { success: true, message: "orden cancelada", error: "" };
        }
        
        // En caso de que se requiera el procesamiento de otro status, se puede ajustar aquí.
        return await response.json();
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "No se pudo cancelar el pedido.",
          variant: 'destructive'
        });
        return null;
      }
    };
    return {
      getOrderList,
      getOrderDetail,
      cancelOrder
    };
};