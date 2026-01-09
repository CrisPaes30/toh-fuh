import { Button } from "@/components/ui/button";
import {
  BarChart3,
  LogOut,
  Menu,
  Plus,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
  Target,
  AlertCircle,
  FileText,
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { user, logout } = useFirebaseAuth();
  const [, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      setLocation("/");
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:relative md:translate-x-0`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-gray-200">
            <Link href="/">
              <div className="flex items-center gap-3 cursor-pointer">
                <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-2 rounded-lg">
                  <Wallet className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">To Fuhh</h1>
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-2">
            {/* Dashboard */}
            <Link href="/">
              <div className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors">
                <BarChart3 className="h-5 w-5" />
                <span className="font-medium">Dashboard</span>
              </div>
            </Link>

            {/* Transações */}
            <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Transações
            </div>
            <Link href="/add-income">
              <div className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-green-50 rounded-lg cursor-pointer transition-colors">
                <Plus className="h-5 w-5" />
                <TrendingUp className="h-4 w-4" />
                <span className="font-medium">Adicionar Entrada</span>
              </div>
            </Link>
            <Link href="/add-expense">
              <div className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-red-50 rounded-lg cursor-pointer transition-colors">
                <Plus className="h-5 w-5" />
                <TrendingDown className="h-4 w-4" />
                <span className="font-medium">Adicionar Gasto</span>
              </div>
            </Link>

            {/* Análises */}
            <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mt-6">
              Análises
            </div>
            <Link href="/analytics">
              <div className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors">
                <BarChart3 className="h-5 w-5" />
                <span className="font-medium">Gráficos e Relatórios</span>
              </div>
            </Link>

            {/* Ferramentas */}
            <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mt-6">
              Ferramentas
            </div>
            <Link href="/goals">
              <div className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-purple-50 rounded-lg cursor-pointer transition-colors">
                <Target className="h-5 w-5" />
                <span className="font-medium">Metas Financeiras</span>
              </div>
            </Link>
            <Link href="/alerts">
              <div className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-orange-50 rounded-lg cursor-pointer transition-colors">
                <AlertCircle className="h-5 w-5" />
                <span className="font-medium">Alertas e Limites</span>
              </div>
            </Link>
            <Link href="/reports">
              <div className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-indigo-50 rounded-lg cursor-pointer transition-colors">
                <FileText className="h-5 w-5" />
                <span className="font-medium">Exportar Relatórios</span>
              </div>
            </Link>
          </nav>

          {/* User Section */}
          <div className="border-t border-gray-200 p-4 space-y-4">
            <div className="px-4 py-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Usuário</p>
              <p className="text-sm font-semibold text-gray-900 mt-1 truncate">
                {user?.displayName || user?.email || "Usuário"}
              </p>
            </div>
            <Button
              onClick={handleLogout}
              className="w-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header Mobile */}
        <div className="md:hidden bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">To Fuhh</h1>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-8">{children}</div>
        </main>
      </div>

      {/* Overlay para mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
