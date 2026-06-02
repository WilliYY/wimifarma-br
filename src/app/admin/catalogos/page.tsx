import { AdminModuleList } from "@/components/admin/admin-module-list";
import { ModulePlaceholder } from "@/components/admin/module-placeholder";
import { adminRoutePermissions } from "@/features/auth/permissions";

export default function Page() {
  return (
    <ModulePlaceholder
      allowedRoles={adminRoutePermissions["/admin/catalogos"]}
      description="Catalogos centralizam produtos, categorias, estoque, imagens, preco normal, preco promocional e status de publicacao."
      title="Catalogos"
    >
      <AdminModuleList
        items={[
          "Adicionar e editar produtos com imagem, categoria, preco e estoque.",
          "Marcar produtos como Farmacia Popular ou receita obrigatoria.",
          "Organizar medicamentos, higiene, beleza, vitaminas e dermo.",
          "Publicar, arquivar ou deixar produtos como rascunho.",
        ]}
      />
    </ModulePlaceholder>
  );
}
