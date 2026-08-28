import {
  getAdminSecretToken,
  isAuthorizedUser,
  verifyAdminToken,
} from "../config/auth";
import type { Env } from "../types";

// ----------------------------------------------------
// POST /api/admin/login - Authenticate Admin User
// ----------------------------------------------------
export async function handleAdminLogin(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    const body = (await request.json()) as { username?: string };
    const username = body.username?.toLowerCase().trim();

    if (username && isAuthorizedUser(username)) {
      return Response.json(
        {
          success: true,
          username: username,
          token: getAdminSecretToken(env),
        },
        { status: 200 },
      );
    }

    return Response.json(
      { success: false, message: "Unauthorized. Invalid username." },
      { status: 401 },
    );
  } catch {
    return Response.json(
      { success: false, message: "Bad request" },
      { status: 400 },
    );
  }
}

// ----------------------------------------------------
// PATCH /api/tickets/:ticketRef - Update ticket (PROTECTED)
// ----------------------------------------------------
export async function handleAdminUpdateTicket(
  ticketRef: string,
  request: Request,
  env: Env,
): Promise<Response> {
  if (!verifyAdminToken(request, env)) {
    return Response.json(
      { success: false, message: "Unauthorized access" },
      { status: 401 },
    );
  }

  try {
    const body: any = await request.json();
    const status = body.status;
    const assignee = body.assignee;
    const priority = body.priority;

    const query = `
      UPDATE tickets
      SET status = COALESCE(?, status),
          assignee = COALESCE(?, assignee),
          priority = COALESCE(?, priority),
          updated_at = CURRENT_TIMESTAMP
      WHERE ticket_ref = ? OR id = ?
      RETURNING *;
    `;

    const updated = await env.ticketing_db
      .prepare(query)
      .bind(
        status || null,
        assignee || null,
        priority || null,
        ticketRef,
        ticketRef,
      )
      .first();

    // If status changed, record system update message
    if (status && updated) {
      const exactRef = (updated as Record<string, any>).ticket_ref || ticketRef;
      const statusMsgQuery = `
        INSERT INTO ticket_messages (ticket_ref, sender_name, sender_role, message)
        VALUES (?, 'System', 'system', ?)
      `;
      await env.ticketing_db
        .prepare(statusMsgQuery)
        .bind(exactRef, `Status changed to ${status}`)
        .run();
    }

    return Response.json({ success: true, ticket: updated });
  } catch (error) {
    return Response.json(
      {
        success: false,
        message: "Failed to update ticket",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
