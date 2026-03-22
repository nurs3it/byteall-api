import { ActionContext } from 'adminjs';

/**
 * Returns true if the current session user can perform the requested action.
 *
 * Rules:
 * - admin: can do everything
 * - any other role: cannot do anything (all resources are hidden in navigation too)
 */
export function canPerformAction(context: ActionContext): boolean {
  const { currentAdmin } = context;
  if (!currentAdmin) return false;
  return currentAdmin.role === 'admin';
}
