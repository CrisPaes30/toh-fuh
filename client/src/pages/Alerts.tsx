import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Loader2, AlertCircle, Trash2, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export default function Alerts() {
  const { user } = useAuth();
  const now = new Date();

  const { data: categories } = trpc.categories.list.useQuery();
  const { data: alerts, refetch: refetchAlerts } = trpc.alerts.list.useQuery({
    unreadOnly: false,
  });
  const { data: limits, refetch: refetchLimits } = trpc.limits.list.useQuery();

  const [formData, setFormData] = useState({
    categoryId: "",
    monthlyLimit: "",
    alertThreshold: "80",
  });

  const createLimitMutation = trpc.limits.create.useMutation({
    onSuccess: () => {
      toast.success("Limite de gasto criado!");
      setFormData({ categoryId: "", monthlyLimit: "", alertThreshold: "80" });
      refetchLimits();
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const deleteLimitMutation = trpc.limits.delete.useMutation({
    onSuccess: () => {
      toast.success("Limite removido!");
      refetchLimits();
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const deleteAlertMutation = trpc.alerts.delete.useMutation({
    onSuccess: () => {
      toast.success("Alerta removido!");
      refetchAlerts();
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const markAsReadMutation = trpc.alerts.markAsRead.useMutation({
    onSuccess: () => {
      refetchAlerts();
    },
  });

  const handleCreateLimit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.categoryId || !formData.monthlyLimit) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    createLimitMutation.mutate({
      categoryId: parseInt(formData.categoryId),
      monthlyLimit: parseFloat(formData.monthlyLimit),
      alertThreshold: parseInt(formData.alertThreshold),
    });
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(cents / 100);
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "limit_exceeded":
        return "🚨";
      case "goal_completed":
        return "🎉";
      case "trend_alert":
        return "📈";
      default:
        return "ℹ️";
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case "limit_exceeded":
        return "border-red-200 bg-red-50";
      case "goal_completed":
        return "border-green-200 bg-green-50";
      case "trend_alert":
        return "border-blue-200 bg-blue-50";
      default:
        return "border-gray-200 bg-gray-50";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Alertas e Limites</h1>
        <p className="text-gray-600 mt-1">
          Configure limites de gastos e receba alertas inteligentes
        </p>
      </div>

      {/* Seção de Limites */}
      <Card>
        <CardHeader>
          <CardTitle>Limites de Gastos</CardTitle>
          <CardDescription>
            Defina limites mensais por categoria e receba alertas quando se aproximar do limite
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleCreateLimit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Select value={formData.categoryId} onValueChange={(v) => setFormData({ ...formData, categoryId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((cat: any) => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                placeholder="Limite mensal (R$)"
                type="number"
                step="0.01"
                value={formData.monthlyLimit}
                onChange={(e) => setFormData({ ...formData, monthlyLimit: e.target.value })}
              />

              <Select value={formData.alertThreshold} onValueChange={(v) => setFormData({ ...formData, alertThreshold: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Alerta em %" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50">50%</SelectItem>
                  <SelectItem value="75">75%</SelectItem>
                  <SelectItem value="80">80%</SelectItem>
                  <SelectItem value="90">90%</SelectItem>
                  <SelectItem value="100">100%</SelectItem>
                </SelectContent>
              </Select>

              <Button type="submit" disabled={createLimitMutation.isPending}>
                {createLimitMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Adicionar"
                )}
              </Button>
            </div>
          </form>

          {limits && limits.length > 0 ? (
            <div className="space-y-3 mt-6">
              {limits.map((limit: any) => (
                <div key={limit.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Categoria {limit.categoryId}</p>
                    <p className="text-sm text-gray-600">
                      Limite: {formatCurrency(limit.monthlyLimit)} • Alerta em {limit.alertThreshold}%
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteLimitMutation.mutate({ id: limit.id })}
                    disabled={deleteLimitMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-4">Nenhum limite configurado</p>
          )}
        </CardContent>
      </Card>

      {/* Seção de Alertas */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Alertas</CardTitle>
          <CardDescription>
            Alertas gerados automaticamente baseado em suas atividades financeiras
          </CardDescription>
        </CardHeader>
        <CardContent>
          {alerts && alerts.length > 0 ? (
            <div className="space-y-3">
              {alerts.map((alert: any) => (
                <div
                  key={alert.id}
                  className={`p-4 rounded-lg border ${getAlertColor(alert.type)} flex items-start justify-between`}
                >
                  <div className="flex items-start gap-3 flex-1">
                    <span className="text-2xl">{getAlertIcon(alert.type)}</span>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {alert.type === "limit_exceeded"
                          ? "Limite de Gasto Excedido"
                          : alert.type === "goal_completed"
                          ? "Meta Concluída"
                          : "Alerta de Tendência"}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(alert.createdAt).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!alert.isRead && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markAsReadMutation.mutate({ id: alert.id })}
                      >
                        <CheckCircle className="h-4 w-4 text-blue-600" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteAlertMutation.mutate({ id: alert.id })}
                      disabled={deleteAlertMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">Nenhum alerta no momento</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
