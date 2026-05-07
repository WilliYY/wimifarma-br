"use client";

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";

type Row = {
  module: string;
  status: string;
  priority: string;
};

const data: Row[] = [
  { module: "Ofertas", priority: "Alta", status: "Base pronta" },
  { module: "Produtos", priority: "Alta", status: "Schema e API" },
  { module: "Roleta", priority: "Media", status: "Campanha preparada" },
  { module: "Cashback", priority: "Futura", status: "Placeholder seguro" },
];

const columns: ColumnDef<Row>[] = [
  { accessorKey: "module", header: "Modulo" },
  { accessorKey: "status", header: "Status" },
  { accessorKey: "priority", header: "Prioridade" },
];

export function AdminDataTable() {
  const table = useReactTable({
    columns,
    data,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-white">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="bg-surface-subtle text-xs uppercase text-muted">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th className="px-4 py-3 font-bold" key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr className="border-t border-line" key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <td className="px-4 py-3 text-ink" key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
