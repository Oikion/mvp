import { prismadb } from "./prisma";

const TENANT_MODELS: Record<string, string> = {
  clients: "organizationId",
  properties: "organizationId",
  documents: "organizationId",
  client_Contacts: "organizationId",
  crm_Accounts_Tasks: "organizationId",
  crm_Accounts_Tasks_Comments: "organizationId",
  calComEvent: "organizationId",
  myAccount: "organizationId",
  feedback: "organizationId",
  notification: "organizationId",
  calendarReminder: "organizationId",
  eventInvitee: "organizationId",
  socialPost: "organizationId",
  attachment: "organizationId",
};

const GUARDED_METHODS = new Set([
  "findMany",
  "findFirst",
  "findFirstOrThrow",
  "findUnique",
  "findUniqueOrThrow",
  "create",
  "createMany",
  "update",
  "updateMany",
  "delete",
  "deleteMany",
  "upsert",
  "count",
  "aggregate",
]);

const METHOD_ALIASES: Record<string, string> = {
  findUnique: "findFirst",
  findUniqueOrThrow: "findFirstOrThrow",
  delete: "deleteMany",
};

type PrismaDelegate = Record<string, any>;

function ensureOrgInData(
  data: Record<string, any> | undefined,
  field: string,
  orgId: string
): Record<string, any> | Record<string, any>[] {
  if (!data) {
    return { [field]: orgId };
  }
  if (Array.isArray(data)) {
    return data.map((entry) => ensureOrgInData(entry, field, orgId));
  }
  if (data[field] === undefined || data[field] === null) {
    return { ...data, [field]: orgId };
  }
  return data;
}

function mergeWhere(
  where: Record<string, any> | undefined,
  field: string,
  orgId: string
) {
  if (!where || Object.keys(where).length === 0) {
    return { [field]: orgId };
  }

  // Prevent double-wrapping if organizationId already enforced
  if (where[field] === orgId) {
    return where;
  }

  return {
    AND: [where, { [field]: orgId }],
  };
}

function applyGuards(
  method: string,
  args: Record<string, any>,
  orgField: string,
  orgId: string
) {
  const nextArgs = { ...(args || {}) };

  switch (method) {
    case "create":
      nextArgs.data = ensureOrgInData(nextArgs.data, orgField, orgId);
      break;
    case "createMany":
      nextArgs.data = ensureOrgInData(nextArgs.data, orgField, orgId);
      break;
    case "upsert":
      nextArgs.create = ensureOrgInData(nextArgs.create, orgField, orgId);
      nextArgs.update = ensureOrgInData(nextArgs.update, orgField, orgId);
      nextArgs.where = mergeWhere(nextArgs.where, orgField, orgId);
      break;
    default:
      nextArgs.where = mergeWhere(nextArgs.where, orgField, orgId);
  }

  return nextArgs;
}

function wrapModel(
  model: PrismaDelegate,
  orgField: string,
  orgId: string
): PrismaDelegate {
  return new Proxy(model, {
    get(target, prop) {
      const propName = String(prop);
      if (!GUARDED_METHODS.has(propName) || typeof target[propName] !== "function") {
        return target[propName];
      }

      const delegateMethod = METHOD_ALIASES[propName] ?? propName;
      const fn = target[delegateMethod];

      return (args?: Record<string, any>) => {
        const guardedArgs = applyGuards(delegateMethod, args ?? {}, orgField, orgId);
        return fn.call(target, guardedArgs);
      };
    },
  });
}

export function prismaForOrg(orgId: string) {
  if (!orgId) {
    throw new Error("Missing organizationId for tenant scope");
  }

  return new Proxy(prismadb, {
    get(target, prop) {
      const propName = String(prop);
      if (!(propName in TENANT_MODELS)) {
        return (target as any)[propName];
      }

      const orgField = TENANT_MODELS[propName];
      const model = (target as any)[propName];
      
      // If model doesn't exist or is not a valid Prisma delegate, return it as-is
      // Prisma delegates are objects with methods like findMany, create, etc.
      if (!model) {
        return model;
      }
      
      // Check if it's a Prisma delegate (has common Prisma methods)
      if (typeof model !== 'object' || typeof model.findMany !== 'function') {
        return model;
      }
      
      return wrapModel(model, orgField, orgId);
    },
  }) as typeof prismadb;
}

export async function withTenantContext<T>(orgId: string, fn: () => Promise<T>) {
  if (!orgId) {
    throw new Error("Missing organizationId for tenant context");
  }

  await prismadb.$executeRaw`SELECT set_config('app.current_tenant', ${orgId}, false);`;
  try {
    return await fn();
  } finally {
    await prismadb.$executeRaw`SELECT set_config('app.current_tenant', '', false);`;
  }
}

