const SYSTEM_WORKSPACE_ROLES = [
  {
    roleName: 'OWNER',
    permissions: [
      'dashboard.view',
      'dashboard.analytics',
      'search.basic',
      'search.advanced',
      'export.prospect',
      'export.company',
      'export.bulk',
      'user.invite',
      'user.remove',
      'user.view',
      'user.edit',
      'credit.allocate',
      'credit.revoke',
      'credit.view',
      'credit.purchase',
      'share.savedSearch',
      'share.list',
      'share.manage',
      'billing.view',
      'billing.manage',
      'subscription.view',
      'subscription.manage',
      'workspace.settings'
    ],
    isSystemRole: true
  },
  {
    roleName: 'ADMIN',
    permissions: [
      'dashboard.view',
      'search.basic',
      'search.advanced',
      'export.prospect',
      'export.company',
      'user.invite',
      'user.view',
      'share.savedSearch',
      'share.list'
    ],
    isSystemRole: true
  },
  {
    roleName: 'MEMBER',
    permissions: [
      'dashboard.view',
      'search.basic',
      'export.prospect',
      'credit.view'
    ],
    isSystemRole: true
  },
  {
    roleName: 'FREE_USER',
    permissions: [
      'dashboard.view',
      'search.basic',
      'credit.view'
    ],
    isSystemRole: true
  }
];

const PERSONAL_WORKSPACE_ROLES = [
  {
    roleName: 'OWNER',
    permissions: [
      'dashboard.view',
      'dashboard.analytics',
      'search.basic',
      'search.advanced',
      'export.prospect',
      'export.company',
      'export.bulk',
      'user.invite',
      'user.remove',
      'user.view',
      'user.edit',
      'credit.allocate',
      'credit.revoke',
      'credit.view',
      'credit.purchase',
      'share.savedSearch',
      'share.list',
      'share.manage',
      'billing.view',
      'billing.manage',
      'subscription.view',
      'subscription.manage',
      'workspace.settings'
    ],
    isSystemRole: true
  },
  {
    roleName: 'MEMBER',
    permissions: [
      'dashboard.view',
      'search.basic',
      'export.prospect',
      'credit.view'
    ],
    isSystemRole: true
  }
];

// Legacy export for SYSTEM_WORKSPACE
const WORKSPACE_ROLES_CONFIG = SYSTEM_WORKSPACE_ROLES;

module.exports = { WORKSPACE_ROLES_CONFIG, SYSTEM_WORKSPACE_ROLES, PERSONAL_WORKSPACE_ROLES };
