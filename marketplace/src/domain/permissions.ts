/**
 * RBAC — matriz única de permissões. O servidor checa `can()` em toda ação;
 * a interface só usa a mesma matriz para esconder o que o usuário não pode
 * fazer (nunca como única barreira).
 */
export const ROLES = ["CUSTOMER", "PROVIDER", "SUPPORT", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  // Cliente
  "booking:create",
  "booking:read:own",
  "address:manage:own",
  "review:create:own",
  // Prestador
  "provider:profile:manage:own",
  "provider:offers:manage:own",
  "provider:schedule:manage:own",
  "provider:bookings:read:own",
  "provider:finance:read:own",
  // Suporte (operação, sem finanças/configurações críticas)
  "support:tickets:manage",
  "support:bookings:read",
  "support:users:read",
  // Administração
  "admin:dashboard:read",
  "admin:catalog:manage",
  "admin:commission:manage",
  "admin:providers:approve",
  "admin:providers:documents:read",
  "admin:users:manage",
  "admin:finance:read",
  "admin:refunds:manage",
  "admin:coupons:manage",
  "admin:reviews:moderate",
  "admin:settings:manage",
  "admin:audit:read",
  "admin:reports:export",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const MATRIX: Record<Role, readonly Permission[]> = {
  CUSTOMER: ["booking:create", "booking:read:own", "address:manage:own", "review:create:own"],
  PROVIDER: [
    "provider:profile:manage:own",
    "provider:offers:manage:own",
    "provider:schedule:manage:own",
    "provider:bookings:read:own",
    "provider:finance:read:own",
  ],
  SUPPORT: ["support:tickets:manage", "support:bookings:read", "support:users:read", "admin:reviews:moderate"],
  ADMIN: PERMISSIONS,
};

export function can(role: Role, permission: Permission): boolean {
  return MATRIX[role].includes(permission);
}

export function permissionsOf(role: Role): readonly Permission[] {
  return MATRIX[role];
}

/** Área inicial de cada papel após o login. */
export const HOME_BY_ROLE: Record<Role, string> = {
  CUSTOMER: "/conta",
  PROVIDER: "/profissional",
  SUPPORT: "/admin/usuarios",
  ADMIN: "/admin",
};

export const ROLE_LABEL: Record<Role, string> = {
  CUSTOMER: "Cliente",
  PROVIDER: "Profissional",
  SUPPORT: "Suporte",
  ADMIN: "Administrador",
};
