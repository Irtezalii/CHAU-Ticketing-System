export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/api/tickets" && request.method === "POST") {
      const ticket = await request.json();

      return Response.json({
        success: true,
        message: "Ticket received successfully",
        ticket,
      });
    }

    return new Response("Not Found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;
