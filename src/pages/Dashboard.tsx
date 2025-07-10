import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Construction, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Panel de Control</h1>
        <p className="text-muted-foreground">
          Gestión general de su e-commerce
        </p>
      </div>

      {/* Card principal de construção */}
      <Card className="border-dashed border-2 border-gray-300">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-orange-100 mb-6">
            <Construction className="h-10 w-10 text-orange-600" />
          </div>
          
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Panel de Control en Construcción
          </h2>
          
          <p className="text-gray-600 mb-6 max-w-md">
            Estamos trabajando para traer datos y estadísticas en tiempo real de su e-commerce. 
            Esta funcionalidad estará disponible próximamente.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
                          <Button
                variant="outline"
                onClick={() => navigate(-1)}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver
              </Button>
          </div>
        </CardContent>
      </Card>

      {/* Cards de recursos futuros */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="opacity-60">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Ventas Totales</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="text-xl font-bold text-gray-400 mb-2">Próximamente</div>
            <div className="h-2 bg-gray-200 rounded-full"></div>
          </CardContent>
        </Card>

        <Card className="opacity-60">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Pedidos</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="text-xl font-bold text-gray-400 mb-2">Próximamente</div>
            <div className="h-2 bg-gray-200 rounded-full"></div>
          </CardContent>
        </Card>

        <Card className="opacity-60">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Clientes</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="text-xl font-bold text-gray-400 mb-2">Próximamente</div>
            <div className="h-2 bg-gray-200 rounded-full"></div>
          </CardContent>
        </Card>

        <Card className="opacity-60">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Productos</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="text-xl font-bold text-gray-400 mb-2">Próximamente</div>
            <div className="h-2 bg-gray-200 rounded-full"></div>
          </CardContent>
        </Card>
      </div>

      {/* Preview dos recursos futuros */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="opacity-60">
          <CardHeader>
            <CardTitle className="text-gray-500">Pedidos Recientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            </div>
          </CardContent>
        </Card>

        <Card className="opacity-60">
          <CardHeader>
            <CardTitle className="text-gray-500">Productos Más Vendidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
