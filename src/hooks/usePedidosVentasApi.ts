import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export const usePedidosVentasApi = () => {
  const { toast } = useToast();
  const { token } = useAuth();  
  const BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/rest/V1/`;
  
  const getOrderList = async (
    currentPage: number = 1,
    pageSize: number = 20,
    searchQuery: string = "",
    status: string = "Todos"
  ) => {
    try {
      let endpoint = `${BASE_URL}orders?searchCriteria[currentPage]=${currentPage}&searchCriteria[pageSize]=${pageSize}`;
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
        const endpoint = `${BASE_URL}orders?searchCriteria[filterGroups][0][filters][0][field]=entity_id&searchCriteria[filterGroups][0][filters][0][value]=${orderId}&searchCriteria[filterGroups][0][filters][0][conditionType]=eq`;
        
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
        const endpoint = `${BASE_URL}orders/${orderId}/cancel`;
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

    const sendOrder = async (orderId: number | string, payload: object) => {
      try {
        const endpoint = `${BASE_URL}order/${orderId}/ship`;
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
    
        if (response.status === 401) {
          throw new Error('401: Token no válido o expirado');
        }
        if (response.status === 400) {
          const errorData = await response.json();
          throw new Error(`400: ${errorData.detail || 'Parámetros inválidos'}`);
        }

        if (response.status === 200) {
          return { success: true, message: "Pedido enviado", error: "" };
        }

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Suponiendo que el endpoint retorne status 200 con el JSON deseado
        return await response.json();
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "No se pudo enviar el pedido.",
          variant: 'destructive'
        });
        return null;
      }
    };

    const detailSaleOrder = async (shipmentId: number | string) => {
      try {
        const endpoint = `${BASE_URL}shipment/${shipmentId}`;
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
    
        return await response.json();
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "No se pudo obtener el detalle del envío.",
          variant: 'destructive'
        });
        return null;
      }
    };

    const detailSaleOrderByIdOrder = async (orderId: number | string) => {
      try {
        const endpoint = `${BASE_URL}shipments?searchCriteria[filterGroups][0][filters][0][field]=order_id&searchCriteria[filterGroups][0][filters][0][value]=${orderId}&searchCriteria[filterGroups][0][filters][0][condition_type]=eq`;
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
        
        return await response.json();
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "No se pudo obtener el detalle del envío por ID de orden.",
          variant: 'destructive'
        });
        return null;
      }
    };

    const getOrdersShipTotals = async (
      currentPage: number = 1,
      pageSize: number = 10,
      searchQuery: string = ""
    ) => {
      try {
        let endpoint = `${BASE_URL}shipments?searchCriteria[currentPage]=${currentPage}&searchCriteria[pageSize]=${pageSize}&searchCriteria[sortOrders][0][field]=created_at&searchCriteria[sortOrders][0][direction]=DESC`;
        
        if (searchQuery.trim()) {
          endpoint += `&searchCriteria[filterGroups][0][filters][0][field]=increment_id`;
          endpoint += `&searchCriteria[filterGroups][0][filters][0][value]=${encodeURIComponent(searchQuery)}`;
          endpoint += `&searchCriteria[filterGroups][0][filters][0][condition_type]=eq`;
        }
        
        const response = await fetch(endpoint, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        });
        
        if (response.status === 401) {
          throw new Error("401: Token no válido o expirado");
        }
        if (response.status === 400) {
          const errorData = await response.json();
          throw new Error(`400: ${errorData.detail || "Parámetros inválidos"}`);
        }
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
    
        // Completar cada shipment con datos adicionales usando getOrderById si es necesario.
        if (data.items && Array.isArray(data.items)) {
          data.items = await Promise.all(
            data.items.map(async (shipment: any) => {
              const orderData = await getOrderById(shipment.order_id);
              return {
                ...shipment,
                increment_id_pedido: orderData?.increment_id,
                customer_firstname: orderData?.customer_firstname,
                customer_lastname: orderData?.customer_lastname,
              };
            })
          );
        }
        
        return data;
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "No se pudo obtener el total de envíos.",
          variant: "destructive"
        });
        return null;
      }
    };

    const getOrderById = async (orderId: number | string) => {
      try {
        const endpoint = `${BASE_URL}orders/${orderId}`;
        const response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        });
    
        if (response.status === 401) {
          throw new Error("401: Token no válido o expirado");
        }
        if (response.status === 400) {
          const errorData = await response.json();
          throw new Error(`400: ${errorData.detail || "Parámetros inválidos"}`);
        }
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
    
        const data = await response.json();
        return data;
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "No se pudo obtener el pedido.",
          variant: "destructive"
        });
        return null;
      }
    };

    return {
      getOrderList,
      getOrderDetail,
      cancelOrder,
      sendOrder,
      detailSaleOrder,
      detailSaleOrderByIdOrder,
      getOrdersShipTotals,
      getOrderById
    };
};