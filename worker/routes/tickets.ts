import { syncTicketToNotion } from "../services/notion";
import type { Env, TicketRequestBody } from "../types";

// ----------------------------------------------------
// GET /api/tickets - Fetch all tickets (PUBLIC)
// ----------------------------------------------------
export async function handleGetTickets(env: Env): Promise<Response> {
  try {
    const query = `
      SELECT t.*,
        (SELECT MAX(created_at) FROM ticket_messages WHERE (ticket_ref = t.ticket_ref OR ticket_ref = ('TK-' || t.id)) AND sender_role = 'agent') as last_agent_message_at,
        (SELECT COUNT(*) FROM ticket_messages WHERE (ticket_ref = t.ticket_ref OR ticket_ref = ('TK-' || t.id)) AND sender_role = 'agent') as agent_message_count
      FROM tickets t
      ORDER BY t.id DESC
    `;
    const { results } = await env.ticketing_db.prepare(query).all();

    return Response.json({ success: true, tickets: results });
  } catch (error) {
    return Response.json(
      {
        success: false,
        message: "Failed to fetch tickets from database",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

// ----------------------------------------------------
// POST /api/tickets - Submit a new ticket (PUBLIC)
// ----------------------------------------------------
export async function handleCreateTicket(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    const body = (await request.json()) as TicketRequestBody;

    const name = body.name?.trim();
    const email = body.email?.trim();
    const subject = body.subject?.trim();
    const requestType = body.requestType?.trim();
    const priority = body.priority?.trim() || "Medium";
    const mainDescription = body.mainDescription?.trim();
    const ticketRef =
      body.ticketRef?.trim() || `TK-${Math.floor(1000 + Math.random() * 9000)}`;

    if (!name || !email || !subject || !requestType || !mainDescription) {
      return Response.json(
        { success: false, message: "Missing required ticket fields" },
        { status: 400 },
      );
    }

    const descriptionSummary = `[${requestType.toUpperCase()}] ${mainDescription}`;

    const query = `
      INSERT INTO tickets (
        ticket_ref,
        name,
        email,
        subject,
        request_type,
        priority,
        description,
        main_description,
        expected_behavior,
        impact,
        callback_phone,
        lead_phone,
        platform_area,
        workspace_kind,
        workspace_name,
        workspace_use,
        needed_by,
        campaign_name,
        campaign_goal,
        go_live_date,
        timeframe,
        status
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN'
      )
      RETURNING *;
    `;

    const insertedTicket = await env.ticketing_db
      .prepare(query)
      .bind(
        ticketRef,
        name,
        email,
        subject,
        requestType,
        priority,
        descriptionSummary,
        mainDescription,
        body.expectedBehavior || null,
        body.impact || null,
        body.phone || null,
        body.leadPhone || null,
        body.platformArea || null,
        body.workspaceKind || null,
        body.workspaceName || null,
        body.workspaceUse || null,
        body.neededBy || null,
        body.campaignName || null,
        body.campaignGoal || null,
        body.goLiveDate || null,
        body.otherTimeframe || null,
      )
      .first();

    // Trigger Notion Page Creation asynchronously
    if (insertedTicket) {
      await syncTicketToNotion(insertedTicket, env);
    }

    return Response.json(
      {
        success: true,
        message: "Ticket persisted successfully",
        ticket: insertedTicket,
      },
      { status: 201 },
    );
  } catch (error) {
    return Response.json(
      {
        success: false,
        message: "Database error saving ticket",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

// ----------------------------------------------------
// GET /api/tickets/:ticketRef - Fetch single ticket (PUBLIC)
// ----------------------------------------------------
export async function handleGetTicket(
  ticketRef: string,
  env: Env,
): Promise<Response> {
  try {
    const ticket = await env.ticketing_db
      .prepare("SELECT * FROM tickets WHERE ticket_ref = ? OR id = ?")
      .bind(ticketRef, ticketRef)
      .first();

    if (!ticket) {
      return Response.json(
        { success: false, message: "Ticket not found" },
        { status: 404 },
      );
    }

    return Response.json({ success: true, ticket });
  } catch (error) {
    return Response.json(
      {
        success: false,
        message: "Failed to fetch ticket details",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

// ----------------------------------------------------
// POST /api/tickets/:ticketRef/reopen (PUBLIC)
// ----------------------------------------------------
export async function handleReopenTicket(
  ticketRef: string,
  env: Env,
): Promise<Response> {
  try {
    const existingTicket = await env.ticketing_db
      .prepare("SELECT * FROM tickets WHERE ticket_ref = ? OR id = ?")
      .bind(ticketRef, ticketRef)
      .first();

    if (!existingTicket) {
      return Response.json(
        { success: false, message: "Ticket not found" },
        { status: 404 },
      );
    }

    const updateQuery = `
      UPDATE tickets
      SET status = 'In Progress',
          updated_at = CURRENT_TIMESTAMP
      WHERE ticket_ref = ? OR id = ?
      RETURNING *;
    `;

    const updatedTicket = await env.ticketing_db
      .prepare(updateQuery)
      .bind(ticketRef, ticketRef)
      .first();

    const exactRef =
      (existingTicket as Record<string, any>).ticket_ref || ticketRef;
    const msgQuery = `
      INSERT INTO ticket_messages (ticket_ref, sender_name, sender_role, message)
      VALUES (?, 'System', 'system', 'Ticket was reopened and moved back to In Progress.')
    `;
    await env.ticketing_db.prepare(msgQuery).bind(exactRef).run();

    return Response.json({
      success: true,
      message: "Ticket reopened successfully",
      ticket: updatedTicket,
    });
  } catch (error) {
    return Response.json(
      {
        success: false,
        message: "Failed to reopen ticket",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
