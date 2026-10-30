import { PageHeader, Panel } from "@/components/ui/page-layout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const entries = [
  { time: "Today, 10:42 AM", user: "Sumit Saxena", action: "Updated company settings", module: "Settings" },
  { time: "Today, 09:18 AM", user: "Anita Sharma", action: "Changed lead status to Qualified", module: "Leads" },
  { time: "Yesterday, 04:35 PM", user: "Sumit Saxena", action: "Created quotation Q-2026-0121", module: "Quotations" },
  { time: "Yesterday, 02:10 PM", user: "Rahul Verma", action: "Updated installation project stage", module: "Projects" },
];

export default function AuditLogPage() {
  return (
    <div className="space-y-2">
      <PageHeader title="Audit log" subtitle="Recent activity across your workspace" />
      <Panel className="overflow-hidden p-0">
        <Table>
          <TableHeader className="bg-slate-50/70">
            <TableRow>
              <TableHead className="px-4">Time</TableHead>
              <TableHead className="px-4">User</TableHead>
              <TableHead className="px-4">Activity</TableHead>
              <TableHead className="px-4">Module</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={`${entry.time}-${entry.action}`}>
                <TableCell className="px-4 text-muted-foreground">{entry.time}</TableCell>
                <TableCell className="px-4 font-medium">{entry.user}</TableCell>
                <TableCell className="px-4">{entry.action}</TableCell>
                <TableCell className="px-4">{entry.module}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <p className="border-t border-slate-100 px-4 py-3 text-xs text-muted-foreground">Sample activity for display. Live audit events are not connected yet.</p>
      </Panel>
    </div>
  );
}
