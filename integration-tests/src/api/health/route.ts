import type { VimsRouteHandler } from "@vims/vims";

export const GET: VimsRouteHandler = async (req, res) => {
  // Test native container traversal and MikroORM instantiation
  const manager = req.manager;
  res.status(200).json({ 
    status: "ok", 
    hasManager: !!manager, 
  });
};
