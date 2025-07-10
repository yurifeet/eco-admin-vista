export const translateOrderStatus = (status: string): string => {
    const translations: Record<string, string> = {
      "canceled": "Cancelado",
      "closed": "Cerrado",
      "complete": "Completo",
      "cuspected fraud": "Sospecha de fraude",
      "holded": "En espera",
      "payment review": "Revisión de pago",
      "paypal caceled reversal": "Reversión cancelada de Paypal",
      "paypal reserved": "Paypal reservado",
      "pending": "Pendiente",
      "pending payment": "Pago Pendiente",
      "pending paypal": "Pendiente de Paypal",
      "processing": "Procesando"
    };
  
    return translations[status] || status;
  };