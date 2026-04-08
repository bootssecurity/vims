export type PolicyResult = {
  allowed: boolean;
  reason?: string;
};

export function allow(): PolicyResult {
  return { allowed: true };
}

export function deny(reason: string): PolicyResult {
  return { allowed: false, reason };
}

export function definePolicy<TArgs>(handler: (args: TArgs) => PolicyResult) {
  return handler;
}
