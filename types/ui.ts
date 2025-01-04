export type NavItem = {
  name: string;
  href: string;
  icon: React.ReactNode;
  subItems?: NavItem[];
  action?: () => void;
  tooltip?: string;
};
