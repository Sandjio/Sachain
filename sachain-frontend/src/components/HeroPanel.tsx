import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Award,
  Target,
  Users,
  DollarSign,
} from 'lucide-react';

const chartData = [
  { name: 'Jan', value: 2400, projects: 12 },
  { name: 'Feb', value: 1398, projects: 8 },
  { name: 'Mar', value: 9800, projects: 15 },
  { name: 'Apr', value: 3908, projects: 11 },
  { name: 'May', value: 4800, projects: 18 },
  { name: 'Jun', value: 3800, projects: 14 },
];

const pieData = [
  { name: 'Completed', value: 45, color: 'hsl(var(--chart-1))' },
  { name: 'In Progress', value: 30, color: 'hsl(var(--chart-2))' },
  { name: 'Planning', value: 15, color: 'hsl(var(--chart-3))' },
  { name: 'On Hold', value: 10, color: 'hsl(var(--chart-4))' },
];

export function HeroPanel() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {/* Main Stats */}
      <Card className="col-span-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Performance Overview</CardTitle>
            <Badge variant="secondary">This Month</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {/* Revenue */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Revenue</span>
              </div>
              <div className="text-2xl font-bold">$45,231</div>
              <div className="flex items-center space-x-1 text-xs">
                <TrendingUp className="h-3 w-3 text-green-500" />
                <span className="text-green-500">+20.1%</span>
                <span className="text-muted-foreground">from last month</span>
              </div>
            </div>

            {/* Active Projects */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Active Projects
                </span>
              </div>
              <div className="text-2xl font-bold">23</div>
              <div className="flex items-center space-x-1 text-xs">
                <TrendingUp className="h-3 w-3 text-green-500" />
                <span className="text-green-500">+12%</span>
                <span className="text-muted-foreground">from last month</span>
              </div>
            </div>

            {/* Team Members */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Team Members
                </span>
              </div>
              <div className="text-2xl font-bold">156</div>
              <div className="flex items-center space-x-1 text-xs">
                <TrendingUp className="h-3 w-3 text-green-500" />
                <span className="text-green-500">+5.4%</span>
                <span className="text-muted-foreground">from last month</span>
              </div>
            </div>

            {/* Completion Rate */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Award className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Completion Rate
                </span>
              </div>
              <div className="text-2xl font-bold">94.5%</div>
              <div className="flex items-center space-x-1 text-xs">
                <TrendingDown className="h-3 w-3 text-red-500" />
                <span className="text-red-500">-2.1%</span>
                <span className="text-muted-foreground">from last month</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <Card className="col-span-full md:col-span-1 lg:col-span-2">
        <CardHeader>
          <CardTitle>Monthly Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="hsl(var(--chart-1))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="col-span-full md:col-span-1 lg:col-span-2">
        <CardHeader>
          <CardTitle>Project Status Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Achievement Cards */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Award className="h-5 w-5" />
            <span>Goal Progress</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Monthly Target</span>
              <span>76%</span>
            </div>
            <Progress value={76} />
          </div>
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Quality Score</span>
              <span>94%</span>
            </div>
            <Progress value={94} />
          </div>
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Team Efficiency</span>
              <span>88%</span>
            </div>
            <Progress value={88} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Achievements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <div className="flex-1">
              <p className="text-sm">Project Alpha completed</p>
              <p className="text-xs text-muted-foreground">2 hours ago</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <div className="flex-1">
              <p className="text-sm">New team member onboarded</p>
              <p className="text-xs text-muted-foreground">5 hours ago</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
            <div className="flex-1">
              <p className="text-sm">Monthly milestone reached</p>
              <p className="text-xs text-muted-foreground">1 day ago</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
