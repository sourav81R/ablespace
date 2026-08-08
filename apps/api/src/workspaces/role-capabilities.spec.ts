import { Capability, roleAllows, WorkspaceRole } from '@ablespace/shared';

/**
 * Permission checks ask about capabilities rather than comparing roles, which
 * is what lets a third role be added later without revisiting call sites.
 */
describe('roleAllows', () => {
  it('grants an owner every capability', () => {
    for (const capability of Object.values(Capability)) {
      expect(roleAllows(WorkspaceRole.OWNER, capability)).toBe(true);
    }
  });

  it('lets a member manage content', () => {
    expect(roleAllows(WorkspaceRole.MEMBER, Capability.MANAGE_CONTENT)).toBe(true);
  });

  it('does not let a member administer the workspace', () => {
    expect(roleAllows(WorkspaceRole.MEMBER, Capability.MANAGE_WORKSPACE)).toBe(false);
    expect(roleAllows(WorkspaceRole.MEMBER, Capability.MANAGE_MEMBERS)).toBe(false);
    expect(roleAllows(WorkspaceRole.MEMBER, Capability.DELETE_WORKSPACE)).toBe(false);
  });

  it('denies an unknown role rather than throwing', () => {
    // Defensive: a role read from an older document must fail closed.
    expect(roleAllows('ADMIN' as WorkspaceRole, Capability.MANAGE_CONTENT)).toBe(false);
  });
});
