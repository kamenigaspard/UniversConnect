/**
 * Messaging permission rules
 *
 * IMPORTANT:
 * This file contains NO Supabase calls.
 * It only determines what type of messaging relationship
 * is required between two users.
 *
 * Actual connection/session/request verification is handled
 * by messagingService.js.
 */

const STAFF_ROLES = ["teacher", "admin"];

/**
 * Check whether a role belongs to staff.
 */
export function isStaffRole(role) {
  return STAFF_ROLES.includes(role);
}

/**
 * Check whether the user is a student.
 */
export function isStudentRole(role) {
  return role === "student";
}

/**
 * Check whether the user is a super administrator.
 */
export function isSuperAdminRole(role) {
  return role === "super_admin";
}

/**
 * Get the basic messaging rule between two users.
 *
 * This function does NOT check:
 * - existing connections
 * - active sessions
 * - pending requests
 *
 * Those require database state and are handled by messagingService.js.
 */
export function getMessagingRule(currentUser, targetUser) {
  if (!currentUser || !targetUser) {
    return {
      allowed: false,
      canMessage: false,
      requiresConnection: false,
      requiresMessageRequest: false,
      reason: "A sender and receiver are required.",
    };
  }

  if (!currentUser.id || !targetUser.id) {
    return {
      allowed: false,
      canMessage: false,
      requiresConnection: false,
      requiresMessageRequest: false,
      reason: "Invalid user information.",
    };
  }

  if (currentUser.id === targetUser.id) {
    return {
      allowed: false,
      canMessage: false,
      requiresConnection: false,
      requiresMessageRequest: false,
      reason: "You cannot message yourself.",
    };
  }

  /**
   * Super admins are intentionally excluded from
   * the current messaging system.
   */
  if (
    isSuperAdminRole(currentUser.role) ||
    isSuperAdminRole(targetUser.role)
  ) {
    return {
      allowed: false,
      canMessage: false,
      requiresConnection: false,
      requiresMessageRequest: false,
      reason:
        "Messaging with a super administrator is not available.",
    };
  }

  /**
   * Student → Teacher/Admin
   *
   * Student must send a message request.
   * After acceptance, a temporary messaging session
   * is created.
   */
  if (
    isStudentRole(currentUser.role) &&
    isStaffRole(targetUser.role)
  ) {
    return {
      allowed: true,
      canMessage: false,
      requiresConnection: false,
      requiresMessageRequest: true,
      reason:
        "A message request must be accepted before messaging.",
      relationshipType: "message_request",
    };
  }

  /**
   * Teacher/Admin → Student
   *
   * Staff can message students directly.
   */
  if (
    isStaffRole(currentUser.role) &&
    isStudentRole(targetUser.role)
  ) {
    return {
      allowed: true,
      canMessage: true,
      requiresConnection: false,
      requiresMessageRequest: false,
      reason: null,
      relationshipType: "direct",
    };
  }

  /**
   * Student → Student
   *
   * They need a permanent connection.
   */
  if (
    isStudentRole(currentUser.role) &&
    isStudentRole(targetUser.role)
  ) {
    return {
      allowed: true,
      canMessage: false,
      requiresConnection: true,
      requiresMessageRequest: false,
      relationshipType: "connection",
      reason:
        "A connection is required before messaging.",
    };
  }

  /**
   * Teacher/Admin → Teacher/Admin
   *
   * Staff members need a permanent connection.
   */
  if (
    isStaffRole(currentUser.role) &&
    isStaffRole(targetUser.role)
  ) {
    return {
      allowed: true,
      canMessage: false,
      requiresConnection: true,
      requiresMessageRequest: false,
      reason:
        "A connection is required before messaging.",
      relationshipType: "connection",
    };
  }

  /**
   * Unknown role combination.
   */
  return {
    allowed: false,
    canMessage: false,
    requiresConnection: false,
    requiresMessageRequest: false,
    reason:
      "These users are not permitted to communicate.",
  };
}

/**
 * Return a user-friendly description of the
 * messaging requirement.
 */
export function getMessagingRequirement(
  currentUser,
  targetUser
) {
  const rule = getMessagingRule(
    currentUser,
    targetUser
  );

  if (!rule.allowed) {
    return rule.reason;
  }

  if (rule.canMessage) {
    return "You can message this user directly.";
  }

  if (rule.requiresMessageRequest) {
    return "Send a message request first.";
  }

  if (rule.requiresConnection) {
    return "Connect with this user before messaging.";
  }

  return rule.reason || null;
}

/**
 * Determine whether the current user can initiate
 * a connection request to the target.
 */
export function canRequestConnection(
  currentUser,
  targetUser
) {
  const rule = getMessagingRule(
    currentUser,
    targetUser
  );

  return (
    rule.allowed &&
    rule.requiresConnection
  );
}

/**
 * Determine whether the current user can initiate
 * a message request.
 */
export function canRequestMessage(
  currentUser,
  targetUser
) {
  const rule = getMessagingRule(
    currentUser,
    targetUser
  );

  return (
    rule.allowed &&
    rule.requiresMessageRequest
  );
}

/**
 * Determine whether the user can directly start
 * messaging based only on role.
 *
 * NOTE:
 * This does NOT mean the database will necessarily
 * allow the message. For example, an expired session
 * still needs to be checked by messagingService.js.
 */
export function canDirectMessageByRole(
  currentUser,
  targetUser
) {
  const rule = getMessagingRule(
    currentUser,
    targetUser
  );

  return (
    rule.allowed &&
    rule.canMessage
  );
}

/**
 * Return a simple action that the UI can use.
 *
 * Possible values:
 *
 * - "message"
 * - "message_request"
 * - "connection_request"
 * - "unavailable"
 */
export function getMessagingAction(
  currentUser,
  targetUser
) {
  const rule = getMessagingRule(
    currentUser,
    targetUser
  );

  if (!rule.allowed) {
    return "unavailable";
  }

  if (rule.canMessage) {
    return "message";
  }

  if (rule.requiresMessageRequest) {
    return "message_request";
  }

  if (rule.requiresConnection) {
    return "connection_request";
  }

  return "unavailable";
}