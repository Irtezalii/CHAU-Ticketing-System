import { verifyAdminToken } from '../config/auth';
import type { Env, MessageRequestBody } from '../types';

// ----------------------------------------------------
// GET /api/tickets/:ticketRef/messages (PUBLIC)
// ----------------------------------------------------
export async function handleGetMessages(
  ticketRef: string,
  env: Env
): Promise<Response> {
  try {
    const { results } = await env.ticketing_db
      .prepare(
        `SELECT m.*,
           a.file_name AS attachment_file_name,
           a.content_type AS attachment_content_type,
           a.size_bytes AS attachment_size_bytes
         FROM ticket_messages m
         LEFT JOIN ticket_attachments a ON a.id = m.attachment_id
         WHERE m.ticket_ref = ?
         ORDER BY m.id ASC`
      )
      .bind(ticketRef)
      .all();

    return Response.json({ success: true, messages: results });
  } catch (error) {
    return Response.json(
      {
        success: false,
        message: 'Failed to fetch messages',
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// ----------------------------------------------------
// POST /api/tickets/:ticketRef/messages (PUBLIC)
// ----------------------------------------------------
export async function handleSendMessage(
  ticketRef: string,
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const body = (await request.json()) as MessageRequestBody;
    const isAdmin = verifyAdminToken(request, env);
    // Role is derived from server-side admin auth, never trusted from the client,
    // so a caller can't self-assign the "agent" role by editing the request body.
    const senderRole = isAdmin ? 'agent' : 'user';
    const senderName =
      body.senderName?.trim() || (isAdmin ? 'Support Specialist' : 'Anonymous');
    const message = body.message?.trim();

    if (!message) {
      return Response.json(
        { success: false, message: 'Message cannot be empty' },
        { status: 400 }
      );
    }

    const query = `
      INSERT INTO ticket_messages (ticket_ref, sender_name, sender_role, message)
      VALUES (?, ?, ?, ?)
      RETURNING *;
    `;

    const insertedMessage = await env.ticketing_db
      .prepare(query)
      .bind(ticketRef, senderName, senderRole, message)
      .first();

    return Response.json(
      { success: true, message: 'Message sent', data: insertedMessage },
      { status: 201 }
    );
  } catch (error) {
    return Response.json(
      {
        success: false,
        message: 'Database error saving message',
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

