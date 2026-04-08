export const vimsCommands = [
  {
    name: "develop",
    description: "Boot the VIMS framework in development mode",
  },
  {
    name: "start",
    description: "Start the VIMS runtime with its discovered modules",
  },
  {
    name: "db:migrate",
    description: "Run ordered package-owned database migrations",
  },
] as const;
