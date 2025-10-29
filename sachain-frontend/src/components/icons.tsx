import {
  User,
  UserPlus,
  LogIn,
  LogOut,
  Wallet,
  Globe,
  ChevronRight,
  CheckCircle,
  Shield,
  BarChart,
  LineChart,
  Menu,
  X,
} from 'lucide-react';

interface IconProps {
  size?: number;
  className?: string;
}

export const Icons = {
  User: (props: IconProps) => <User {...props} />,
  UserPlus: (props: IconProps) => <UserPlus {...props} />,
  LogIn: (props: IconProps) => <LogIn {...props} />,
  LogOut: (props: IconProps) => <LogOut {...props} />,
  Wallet: (props: IconProps) => <Wallet {...props} />,
  Globe: (props: IconProps) => <Globe {...props} />,
  ChevronRight: (props: IconProps) => <ChevronRight {...props} />,
  CheckCircle: (props: IconProps) => <CheckCircle {...props} />,
  Shield: (props: IconProps) => <Shield {...props} />,
  BarChart: (props: IconProps) => <BarChart {...props} />,
  LineChart: (props: IconProps) => <LineChart {...props} />,
  Menu: (props: IconProps) => <Menu {...props} />,
  X: (props: IconProps) => <X {...props} />,
};
