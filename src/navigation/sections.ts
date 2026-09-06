import {
  BadgeCheck,
  BarChart3,
  Boxes,
  Building2,
  CircleDollarSign,
  CreditCard,
  GraduationCap,
  Bell,
  BellRing,
  LayoutGrid,
  Megaphone,
  MessageSquare,
  Network,
  Package,
  QrCode,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Store,
  Undo2,
  Users,
  Wallet,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

/**
 * The seller's own mental model, carried over verbatim from the web portal's
 * sidebar (HubShell.tsx) — what they buy from BND, what they sell, what stock
 * they hold, what they get paid. Same groups, same order, same labels, so a
 * seller who knows the website is not relearning anything here.
 *
 * The web fits all 22 of these in a sidebar. A phone cannot, so the four most
 * frequent become bottom tabs and the rest live under More, which renders
 * exactly these groups. `comingSoon` mirrors the web flag: in the IA, no route
 * yet, shown dimmed rather than linking to a dead end.
 */
export interface SectionItem {
  href: string;
  label: string;
  icon: LucideIcon;
  comingSoon?: boolean;
}

export interface SectionGroup {
  label?: string;
  items: SectionItem[];
}

export const MORE_SECTIONS: SectionGroup[] = [
  {
    items: [
      { href: '/notifications', label: 'Notifications', icon: Bell },
      { href: '/messages', label: 'Messages', icon: MessageSquare },
      { href: '/copypaste', label: 'Copypaste posting', icon: Megaphone },
      { href: '/trainings', label: 'Trainings', icon: GraduationCap },
    ],
  },
  {
    label: 'Buy from BND',
    items: [
      { href: '/activated', label: 'Activated products', icon: BadgeCheck },
      { href: '/purchases', label: 'Purchases', icon: ShoppingBag },
      { href: '/group-orders', label: 'Group orders', icon: Users },
    ],
  },
  {
    label: 'Sell to customers',
    items: [
      { href: '/storefront', label: 'Online storefront', icon: Store },
      { href: '/create-order', label: 'Create order', icon: ShoppingCart },
      { href: '/scan', label: 'Scan QR', icon: QrCode },
    ],
  },
  {
    label: 'Stock',
    items: [
      { href: '/inventory', label: 'Inventory', icon: Boxes },
      { href: '/recovery', label: 'Inventory recovery', icon: Undo2, comingSoon: true },
      { href: '/branches', label: 'Branches', icon: Building2 },
    ],
  },
  {
    label: 'Money',
    items: [
      { href: '/finance', label: 'Finance', icon: CircleDollarSign },
      { href: '/billing', label: 'Billing', icon: CreditCard },
      { href: '/reports', label: 'Reports', icon: BarChart3 },
      { href: '/referrals', label: 'Referrals', icon: Network },
    ],
  },
  {
    items: [
      { href: '/profile', label: 'Seller profile', icon: Settings },
      { href: '/notification-settings', label: 'Push notifications', icon: BellRing },
    ],
  },
];

/** Icons for the four bottom tabs, kept next to the rest of the IA. */
export const TAB_ICONS = {
  dashboard: LayoutGrid,
  orders: Package,
  catalogue: ShoppingBag,
  wallet: Wallet,
} as const;
