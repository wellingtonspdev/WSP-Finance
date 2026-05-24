import { Request, Response, NextFunction } from 'express';

/**
 * WorkspaceRouteParamGuard
 *
 * Adapter middleware for routes where :workspaceId is the source of truth.
 * Must run BEFORE WorkspaceMiddleware in the middleware chain.
 *
 * Behavior:
 * 1. Reads :workspaceId from route params and validates it is a positive integer.
 * 2. If x-workspace-id header is present and diverges from :workspaceId → 403 fail-closed.
 * 3. If x-workspace-id header is absent → injects the route param value so WorkspaceMiddleware works.
 * 4. If x-workspace-id header matches → pass-through.
 */
export function WorkspaceRouteParamGuard(req: Request, res: Response, next: NextFunction) {
  const routeParam = req.params.workspaceId;

  if (!routeParam) {
    return res.status(400).json({ message: 'Workspace ID is required in the route.' });
  }

  const workspaceIdFromRoute = Number(routeParam);

  if (!Number.isInteger(workspaceIdFromRoute) || workspaceIdFromRoute <= 0) {
    return res.status(400).json({ message: 'Workspace ID must be a valid positive integer.' });
  }

  const headerValue = req.headers['x-workspace-id'];

  if (headerValue !== undefined) {
    const headerString = Array.isArray(headerValue) ? headerValue[0] : headerValue;
    const workspaceIdFromHeader = Number(headerString);

    if (workspaceIdFromHeader !== workspaceIdFromRoute) {
      return res.status(403).json({ message: 'Access denied.' });
    }
  } else {
    // Inject route param into header so WorkspaceMiddleware can read it
    req.headers['x-workspace-id'] = String(workspaceIdFromRoute);
  }

  return next();
}
