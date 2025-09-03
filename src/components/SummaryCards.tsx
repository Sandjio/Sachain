import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Badge } from "./ui/badge"
import { CalendarDays, Clock, CheckCircle, AlertTriangle, Users, TrendingUp } from "lucide-react"

const summaryData = [
  {
    title: "Total Projects",
    value: "156",
    change: "+12%",
    changeType: "positive",
    icon: CalendarDays,
    description: "Active and completed projects"
  },
  {
    title: "Pending Tasks",
    value: "24",
    change: "-8%",
    changeType: "positive",
    icon: Clock,
    description: "Tasks awaiting completion"
  },
  {
    title: "Completed This Week",
    value: "18",
    change: "+23%",
    changeType: "positive",
    icon: CheckCircle,
    description: "Successfully finished projects"
  },
  {
    title: "Issues Resolved",
    value: "47",
    change: "+15%",
    changeType: "positive",
    icon: AlertTriangle,
    description: "Problems fixed this month"
  },
  {
    title: "Team Productivity",
    value: "92%",
    change: "+5%",
    changeType: "positive",
    icon: TrendingUp,
    description: "Overall team efficiency score"
  },
  {
    title: "Active Users",
    value: "1,234",
    change: "+18%",
    changeType: "positive",
    icon: Users,
    description: "Monthly active users"
  }
]

export function SummaryCards() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Summary</h2>
        <Badge variant="outline">Last 30 days</Badge>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {summaryData.map((item, index) => {
          const Icon = item.icon
          return (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{item.value}</div>
                <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-1">
                  <span className={`font-medium ${
                    item.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {item.change}
                  </span>
                  <span>from last period</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">{item.description}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}