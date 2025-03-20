"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RoleGate } from "@/components/auth/role-gate";
import { UserRole } from "@/lib/roles";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Filter,
  RefreshCw,
  Calendar,
  ChevronDown,
  Download,
  UserCheck,
  Settings,
  FileText,
  ShieldAlert,
  LogIn,
  AlertTriangle,
  Clock,
  Check,
  X,
  Edit,
  Trash,
  Plus,
  Eye
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { notification } from "@/lib/notification";

// Define activity log entry type
type ActivityLogEntry = {
  id: string;
  timestamp: Date;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  action: string;
  resource: string;
  details: string;
  ip: string;
  status: 'success' | 'failed' | 'warning';
};

// Fake data generator for activity logs
const generateActivityLogs = (count: number): ActivityLogEntry[] => {
  const actions = [
    'login', 'logout', 'create', 'update', 'delete', 'view',
    'export', 'import', 'enable', 'disable', 'reset', 'invite',
    'approve', 'reject', 'download'
  ];

  const resources = [
    'user', 'product', 'order', 'invoice', 'payment', 'setting',
    'report', 'dashboard', 'profile', 'document', 'file', 'role',
    'permission', 'api-key', 'password'
  ];

  const users = [
    { id: '1', name: 'Admin User', email: 'admin@example.com', role: 'admin' },
    { id: '2', name: 'Demo User', email: 'user@example.com', role: 'user' },
    { id: '3', name: 'Jane Smith', email: 'jane@example.com', role: 'manager' },
    { id: '4', name: 'John Doe', email: 'john@example.com', role: 'user' },
    { id: '5', name: 'Sarah Lee', email: 'sarah@example.com', role: 'manager' },
  ];

  const statuses = ['success', 'failed', 'warning'] as const;

  return Array.from({ length: count }).map((_, index) => {
    const action = actions[Math.floor(Math.random() * actions.length)];
    const resource = resources[Math.floor(Math.random() * resources.length)];
    const user = users[Math.floor(Math.random() * users.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];

    const date = new Date();
    date.setMinutes(date.getMinutes() - (index * 15));

    // Generate a plausible detail based on action and resource
    let details = '';
    switch (action) {
      case 'login':
        details = `Successful login from ${['Chrome', 'Firefox', 'Safari', 'Edge'][Math.floor(Math.random() * 4)]} on ${['Windows', 'macOS', 'iOS', 'Android'][Math.floor(Math.random() * 4)]}`;
        break;
      case 'create':
        details = `Created new ${resource} with ID #${1000 + Math.floor(Math.random() * 9000)}`;
        break;
      case 'update':
        details = `Updated ${resource} information`;
        break;
      case 'delete':
        details = `Deleted ${resource} with ID #${1000 + Math.floor(Math.random() * 9000)}`;
        break;
      case 'view':
        details = `Viewed ${resource} details`;
        break;
      case 'export':
        details = `Exported ${resource} data as CSV`;
        break;
      default:
        details = `Performed ${action} on ${resource}`;
    }

    // Generate a random IP address
    const ip = `192.168.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;

    return {
      id: `log-${index}`,
      timestamp: date,
      user,
      action,
      resource,
      details,
      ip,
      status,
    };
  });
};

export default function ActivityLogPage() {
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [userFilter, setUserFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);

  // Simulate loading logs from an API
  useEffect(() => {
    const loadLogs = async () => {
      setIsLoading(true);

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Generate some fake logs
      const generatedLogs = generateActivityLogs(50);
      setLogs(generatedLogs);

      setIsLoading(false);
    };

    loadLogs();
  }, []);

  const handleRefresh = async () => {
    setIsLoading(true);
    notification.info("Refreshing activity logs...");

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Generate some new fake logs
    const newLogs = generateActivityLogs(50);
    setLogs(newLogs);

    setIsLoading(false);
    notification.success("Activity logs refreshed");
  };

  // Filter logs based on search and filter criteria
  const filteredLogs = logs.filter(log => {
    const matchesSearch = searchTerm === "" ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.resource.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesAction = actionFilter === "all" || log.action === actionFilter;
    const matchesUser = userFilter === "all" || log.user.id === userFilter;

    return matchesSearch && matchesAction && matchesUser;
  });

  // Get unique actions for filter
  const uniqueActions = Array.from(new Set(logs.map(log => log.action)));

  // Get unique users for filter
  const uniqueUsers = Array.from(new Set(logs.map(log => log.user.id))).map(
    userId => logs.find(log => log.user.id === userId)?.user
  ).filter(Boolean) as ActivityLogEntry['user'][];

  // Format a timestamp
  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;

    return date.toLocaleDateString();
  };

  // Get icon for action type
  const getActionIcon = (action: string, status: ActivityLogEntry['status']) => {
    if (status === 'failed') return <X className="h-4 w-4 text-red-500" />;
    if (status === 'warning') return <AlertTriangle className="h-4 w-4 text-yellow-500" />;

    switch (action) {
      case 'login': return <LogIn className="h-4 w-4 text-blue-500" />;
      case 'create': return <Plus className="h-4 w-4 text-green-500" />;
      case 'update': return <Edit className="h-4 w-4 text-blue-500" />;
      case 'delete': return <Trash className="h-4 w-4 text-red-500" />;
      case 'view': return <Eye className="h-4 w-4 text-gray-500" />;
      case 'export': return <Download className="h-4 w-4 text-purple-500" />;
      default: return <Check className="h-4 w-4 text-green-500" />;
    }
  };

  // Get status badge color
  const getStatusBadge = (status: ActivityLogEntry['status']) => {
    switch (status) {
      case 'success': return <Badge className="bg-green-500/10 text-green-500">Success</Badge>;
      case 'failed': return <Badge className="bg-red-500/10 text-red-500">Failed</Badge>;
      case 'warning': return <Badge className="bg-yellow-500/10 text-yellow-500">Warning</Badge>;
      default: return null;
    }
  };

  // This page is only accessible to admins
  return (
    <RoleGate allowedRoles={[UserRole.ADMIN]}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Activity Log</h1>
            <p className="text-muted-foreground">
              Track user actions and system events
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>

            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>System Activity</CardTitle>
                <CardDescription>
                  All user actions in the system
                </CardDescription>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                <div className="relative w-full sm:w-auto">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search logs..."
                    className="w-full sm:w-[200px] pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger className="w-full sm:w-[160px]">
                    <SelectValue placeholder="Filter by action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    {uniqueActions.map((action) => (
                      <SelectItem key={action} value={action}>
                        {action.charAt(0).toUpperCase() + action.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={userFilter} onValueChange={setUserFilter}>
                  <SelectTrigger className="w-full sm:w-[160px]">
                    <SelectValue placeholder="Filter by user" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    {uniqueUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {isLoading ? (
              <div className="py-8 text-center">
                <RefreshCw className="h-8 w-8 mx-auto mb-4 animate-spin text-muted-foreground" />
                <p className="text-muted-foreground">Loading activity logs...</p>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="py-8 text-center">
                <FileText className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No activity logs found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[180px]">Timestamp</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead className="hidden md:table-cell">Resource</TableHead>
                      <TableHead className="hidden lg:table-cell">Details</TableHead>
                      <TableHead className="hidden lg:table-cell">IP Address</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                            <span>{formatTimestamp(log.timestamp)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{log.user.name}</div>
                          <div className="text-xs text-muted-foreground">{log.user.email}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            {getActionIcon(log.action, log.status)}
                            <span className="ml-2 capitalize">{log.action}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell capitalize">
                          {log.resource}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell max-w-xs truncate">
                          {log.details}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {log.ip}
                        </TableCell>
                        <TableCell className="text-right">
                          {getStatusBadge(log.status)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </RoleGate>
  );
}
