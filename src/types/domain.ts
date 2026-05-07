export type ApiResponse<T> =
  | {
      data: T;
      error?: never;
    }
  | {
      data?: never;
      error: unknown;
    };

export type AdminModuleStatus = "planned" | "base-ready" | "active";
