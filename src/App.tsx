import { useState } from "react";

type TicketResponse = {
  success: boolean;
  message: string;
  ticketId?: number;
};

function App() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [requestType, setRequestType] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [description, setDescription] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [ticketId, setTicketId] = useState<number | null>(null);

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setIsSubmitting(true);
    setSuccessMessage("");
    setErrorMessage("");
    setTicketId(null);

    const ticket = {
      name,
      email,
      subject,
      requestType,
      priority,
      description,
    };

    try {
      const response = await fetch("/api/tickets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(ticket),
      });

      const data: TicketResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Something went wrong.");
      }

      setSuccessMessage(data.message);
      setTicketId(data.ticketId ?? null);

      setName("");
      setEmail("");
      setSubject("");
      setRequestType("");
      setPriority("Medium");
      setDescription("");
    } catch (error) {
      console.error("Ticket submission error:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to submit your ticket. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F7FAFC] px-4 py-10 sm:py-16">
      <div className="mx-auto max-w-3xl">

        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#63B3ED] shadow-md">
            <svg
              className="h-7 w-7 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 10h8M8 14h5m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-[#2D3748] sm:text-4xl">
            Submit a Support Ticket
          </h1>

          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-gray-500 sm:text-base">
            Tell us what you need help with and our team will get back to you
            as soon as possible.
          </p>
        </div>

        {/* Form Card */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl shadow-gray-200/50">

          {/* Card Header */}
          <div className="border-b border-gray-100 bg-[#2D3748] px-6 py-5 sm:px-8">
            <h2 className="text-lg font-semibold text-white">
              Ticket Information
            </h2>

            <p className="mt-1 text-sm text-gray-300">
              Please provide the details below.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 sm:p-8">

            {/* Success Message */}
            {successMessage && (
              <div
                className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4"
                role="alert"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-500 text-white">
                    ✓
                  </div>

                  <div>
                    <p className="font-semibold text-green-800">
                      Ticket submitted successfully
                    </p>

                    <p className="mt-1 text-sm text-green-700">
                      {successMessage}
                      {ticketId && (
                        <>
                          {" "}
                          Your ticket number is{" "}
                          <span className="font-bold">
                            #{ticketId}
                          </span>
                          .
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {errorMessage && (
              <div
                className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4"
                role="alert"
              >
                <p className="font-semibold text-red-800">
                  Unable to submit ticket
                </p>

                <p className="mt-1 text-sm text-red-700">
                  {errorMessage}
                </p>
              </div>
            )}

            {/* Name + Email */}
            <div className="grid gap-6 sm:grid-cols-2">

              <div>
                <label
                  htmlFor="name"
                  className="mb-2 block text-sm font-semibold text-[#2D3748]"
                >
                  Name
                </label>

                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="John Doe"
                  required
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-[#2D3748] outline-none transition placeholder:text-gray-400 focus:border-[#63B3ED] focus:ring-4 focus:ring-[#90CDF4]/30"
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-semibold text-[#2D3748]"
                >
                  Email
                </label>

                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="john@example.com"
                  required
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-[#2D3748] outline-none transition placeholder:text-gray-400 focus:border-[#63B3ED] focus:ring-4 focus:ring-[#90CDF4]/30"
                />
              </div>

            </div>

            {/* Subject */}
            <div className="mt-6">
              <label
                htmlFor="subject"
                className="mb-2 block text-sm font-semibold text-[#2D3748]"
              >
                Subject
              </label>

              <input
                id="subject"
                type="text"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="What do you need help with?"
                required
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-[#2D3748] outline-none transition placeholder:text-gray-400 focus:border-[#63B3ED] focus:ring-4 focus:ring-[#90CDF4]/30"
              />
            </div>

            {/* Request Type + Priority */}
            <div className="mt-6 grid gap-6 sm:grid-cols-2">

              <div>
                <label
                  htmlFor="requestType"
                  className="mb-2 block text-sm font-semibold text-[#2D3748]"
                >
                  Request Type
                </label>

                <select
                  id="requestType"
                  value={requestType}
                  onChange={(event) => setRequestType(event.target.value)}
                  required
                  className="w-full cursor-pointer rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-[#2D3748] outline-none transition focus:border-[#63B3ED] focus:ring-4 focus:ring-[#90CDF4]/30"
                >
                  <option value="">Select request type</option>
                  <option value="Technical Support">
                    Technical Support
                  </option>
                  <option value="Billing">Billing</option>
                  <option value="General Inquiry">
                    General Inquiry
                  </option>
                  <option value="Bug Report">Bug Report</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="priority"
                  className="mb-2 block text-sm font-semibold text-[#2D3748]"
                >
                  Priority
                </label>

                <select
                  id="priority"
                  value={priority}
                  onChange={(event) => setPriority(event.target.value)}
                  required
                  className="w-full cursor-pointer rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-[#2D3748] outline-none transition focus:border-[#63B3ED] focus:ring-4 focus:ring-[#90CDF4]/30"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>

            </div>

            {/* Description */}
            <div className="mt-6">
              <label
                htmlFor="description"
                className="mb-2 block text-sm font-semibold text-[#2D3748]"
              >
                Description
              </label>

              <textarea
                id="description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Please describe your issue in as much detail as possible..."
                rows={6}
                required
                className="w-full resize-y rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm leading-6 text-[#2D3748] outline-none transition placeholder:text-gray-400 focus:border-[#63B3ED] focus:ring-4 focus:ring-[#90CDF4]/30"
              />
            </div>

            {/* Submit Area */}
            <div className="mt-8 flex flex-col-reverse gap-4 border-t border-gray-100 pt-6 sm:flex-row sm:items-center sm:justify-between">

              <p className="text-xs leading-5 text-gray-500">
                Please make sure your contact information is correct.
              </p>

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2D3748] px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-[#1F2937] focus:outline-none focus:ring-4 focus:ring-[#90CDF4]/40 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <svg
                      className="h-4 w-4 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                      />
                    </svg>

                    Submitting...
                  </>
                ) : (
                  <>
                    Submit Ticket
                    <span aria-hidden="true">→</span>
                  </>
                )}
              </button>

            </div>
          </form>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-gray-400">
          Your information is securely submitted to our support system.
        </p>

      </div>
    </main>
  );
}

export default App;
