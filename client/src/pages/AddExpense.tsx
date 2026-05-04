import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { Loader2, Minus } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getUserCategories, createTransaction } from "@/lib/db";

export default function AddExpense() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    categoryId: "",
    amount: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
  });

  const { data: allCategories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: getUserCategories,
  });

  const expenseCategories = useMemo(
    () => allCategories.filter((c) => c.type === "expense"),
    [allCategories]
  );

  const mutation = useMutation({
    mutationFn: (data: Parameters<typeof createTransaction>[0]) =>
      createTransaction(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
      toast.success("Gasto registrado com sucesso!");
      setFormData({
        categoryId: "",
        amount: "",
        description: "",
        date: new Date().toISOString().split("T")[0],
      });
      setTimeout(() => setLocation("/"), 800);
    },
    onError: (error) => {
      console.error(error);
      toast.error("Erro ao salvar o gasto.");
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.categoryId || !formData.amount) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    const amountNumber = Number(formData.amount);
    if (Number.isNaN(amountNumber) || amountNumber <= 0) {
      toast.error("Informe um valor válido.");
      return;
    }

    mutation.mutate({
      type: "expense",
      categoryId: formData.categoryId,
      amount: amountNumber,
      description: formData.description || undefined,
      date: new Date(formData.date + "T12:00:00"),
    });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Minus className="h-5 w-5 text-red-600" />
            Registrar Gasto
          </CardTitle>
          <CardDescription>
            Adicione uma nova despesa (compras, contas, etc.)
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Categoria *</Label>
                <Select
                  value={formData.categoryId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, categoryId: value })
                  }
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoriesLoading ? (
                      <SelectItem value="loading" disabled>
                        Carregando categorias...
                      </SelectItem>
                    ) : expenseCategories.length > 0 ? (
                      expenseCategories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="empty" disabled>
                        Nenhuma categoria disponível
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Valor (R$) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Data *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                placeholder="Ex: Compra de alimentos no mercado"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>

            <div className="flex gap-3">
              <Button
                type="submit"
                disabled={mutation.isPending}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Minus className="h-4 w-4 mr-2" />
                    Registrar Gasto
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation("/")}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
