import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2, Plus, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getUserCategories, createCategory, deleteCategory } from "@/lib/db";

export default function CategoriesPage() {
  const [name, setName] = useState("");
  const [type, setType] = useState<"income" | "expense">("income");
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: getUserCategories,
  });

  const income = useMemo(() => items.filter((c) => c.type === "income"), [items]);
  const expense = useMemo(() => items.filter((c) => c.type === "expense"), [items]);

  const createMutation = useMutation({
    mutationFn: (data: { name: string; type: "income" | "expense" }) =>
      createCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setName("");
      setType("income");
      toast.success("Categoria criada!");
    },
    onError: (e) => {
      console.error(e);
      toast.error("Não foi possível criar a categoria.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Categoria removida!");
    },
    onError: (e) => {
      console.error(e);
      toast.error("Não foi possível remover.");
    },
  });

  const handleAdd = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Informe o nome da categoria.");
      return;
    }
    createMutation.mutate({ name: trimmed, type });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Categorias</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div className="md:col-span-2 space-y-2">
              <Label>Nome</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Salário"
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as "income" | "expense")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Entrada</SelectItem>
                  <SelectItem value="expense">Gasto</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={handleAdd}
            disabled={createMutation.isPending}
            className="w-full"
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar categoria
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Entradas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              <p className="text-sm text-gray-500">Carregando...</p>
            ) : income.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhuma categoria de entrada.</p>
            ) : (
              income.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between border rounded-lg px-3 py-2"
                >
                  <span className="text-sm">{c.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMutation.mutate(c.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Gastos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              <p className="text-sm text-gray-500">Carregando...</p>
            ) : expense.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhuma categoria de gasto.</p>
            ) : (
              expense.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between border rounded-lg px-3 py-2"
                >
                  <span className="text-sm">{c.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMutation.mutate(c.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
