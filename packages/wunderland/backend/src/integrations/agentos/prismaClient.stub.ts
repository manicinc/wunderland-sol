/**
 * Minimal PrismaClient stub used in the backend AgentOS integration when the real
 * Prisma client is not available. Mirrors the behaviour of the AgentOS package stub.
 */
export class PrismaClient {
  [key: string]: any;

  constructor() {
    return new Proxy(this, {
      get: (target, prop: string) => {
        if (prop === '$connect' || prop === '$disconnect') {
          return async () => undefined;
        }
        if (!(prop in target)) {
          target[prop] = this.createModelProxy(prop);
        }
        return target[prop];
      },
    });
  }

  private createModelProxy(modelName: string) {
    return new Proxy(
      {},
      {
        get: (_target, methodName: string) => {
          return async (...args: any[]) => {
            console.warn(
              `[AgentOS][PrismaStub] Called prisma.${modelName}.${String(
                methodName,
              )}() but Prisma is not configured in this environment.`,
              { args },
            );
            return null;
          };
        },
      },
    );
  }
}
