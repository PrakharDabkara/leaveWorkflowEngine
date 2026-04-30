import React from "react";
import { createRoot } from "react-dom/client";
import { CalendarCheck, ClipboardList, Loader2, Search, Send } from "lucide-react";
import "./styles.css";

const initialForm = {
  employeeId: "",
  leaveStart: "",
  leaveEnd: "",
  workflowType: "leaveApproval",
  reason: ""
};

function formatDate(value) {
  if (!value) return null;
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

function App() {
  const [form, setForm] = React.useState(initialForm);
  const [createdRequest, setCreatedRequest] = React.useState(null);
  const [submitState, setSubmitState] = React.useState({ status: "idle", message: "" });
  const [lookupId, setLookupId] = React.useState("");
  const [lookupState, setLookupState] = React.useState({ status: "idle", message: "" });
  const [lookupResult, setLookupResult] = React.useState(null);
  const today = React.useMemo(() => new Date().toISOString().slice(0, 10), []);

  const leaveDays = React.useMemo(() => {
    if (!form.leaveStart || !form.leaveEnd) return 0;
    const start = new Date(form.leaveStart);
    const end = new Date(form.leaveEnd);
    const diff = end.getTime() - start.getTime();
    if (Number.isNaN(diff) || diff < 0) return 0;
    return Math.floor(diff / 86400000) + 1;
  }, [form.leaveStart, form.leaveEnd]);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submitLeave(event) {
    event.preventDefault();
    setCreatedRequest(null);

    if (!form.employeeId || !form.leaveStart || !form.leaveEnd || !form.reason.trim()) {
      setSubmitState({ status: "error", message: "Complete every required field before submitting." });
      return;
    }

    if (form.leaveStart < today) {
      setSubmitState({ status: "error", message: "Leave start date cannot be before the current date." });
      return;
    }

    if (new Date(form.leaveEnd) < new Date(form.leaveStart)) {
      setSubmitState({ status: "error", message: "Leave end date cannot be before the start date." });
      return;
    }

    setSubmitState({ status: "loading", message: "Submitting leave request..." });

    try {
      const response = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          employeeId: Number(form.employeeId)
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to submit leave request.");
      }

      setCreatedRequest(data);
      setSubmitState({ status: "success", message: `Request #${data.id} submitted for approval.` });
      setForm(initialForm);
    } catch (error) {
      setSubmitState({ status: "error", message: error.message });
    }
  }

  async function lookupRequest(event) {
    event.preventDefault();
    setLookupResult(null);

    if (!lookupId) {
      setLookupState({ status: "error", message: "Enter a request ID to search." });
      return;
    }

    setLookupState({ status: "loading", message: "Finding request..." });

    try {
      const response = await fetch(`/api/requests/${lookupId}`);
      const data = await response.json();

      if (!response.ok || !data) {
        throw new Error("No leave request found for that ID.");
      }

      setLookupResult(data);
      setLookupState({ status: "success", message: `Request #${data.id} loaded.` });
    } catch (error) {
      setLookupState({ status: "error", message: error.message });
    }
  }

  return (
    <main className="app-shell">
      <section className="intro-band">
        <div>
          <p className="eyebrow">Leave Workflow Engine</p>
          <h1>Apply for leave.</h1>
          <p className="intro-copy">
            Submit leave requests into the existing workflow API and track the approval status from one browser.
          </p>
        </div>
        <div className="status-strip" aria-label="Workflow stages">
          <span>Employee</span>
          <span>DM Review</span>
          <span>RM Decision</span>
        </div>
      </section>

      <section className="workspace">
        <form className="panel form-panel" onSubmit={submitLeave}>
          <div className="panel-heading">
            <CalendarCheck size={24} aria-hidden="true" />
            <div>
              <h2>Leave Application</h2>
              <p>Creates a workflow request and triggers the approval automation.</p>
            </div>
          </div>

          <div className="form-grid">
            <label>
              Employee ID
              <input
                name="employeeId"
                type="number"
                min="1"
                value={form.employeeId}
                onChange={updateField}
                placeholder="1"
                required
              />
            </label>

            <label>
              Workflow Type
              <select name="workflowType" value={form.workflowType} onChange={updateField}>
                <option value="leaveApproval">Leave Approval</option>
              </select>
            </label>

            <label>
              Start Date
              <input
                name="leaveStart"
                type="date"
                min={today}
                value={form.leaveStart}
                onChange={updateField}
                required
              />
            </label>

            <label>
              End Date
              <input name="leaveEnd" type="date" value={form.leaveEnd} onChange={updateField} required />
            </label>
          </div>

          <label>
            Reason
            <textarea
              name="reason"
              value={form.reason}
              onChange={updateField}
              placeholder="Add a short reason for the leave request"
              rows="5"
              required
            />
          </label>
          <div className="summary-line">
          {leaveDays &&(
            <span>{leaveDays || "-"} day{leaveDays === 1 ? "" : "s"}</span>
          )}
          {form.leaveStart && form.leaveEnd && (
          <span>
             {formatDate(form.leaveStart)} to {formatDate(form.leaveEnd)}
          </span>
          )} 
          </div>

          {submitState.message && (
            <p className={`notice ${submitState.status}`} role="status">
              {submitState.message}
            </p>
          )}

          <button type="submit" className="primary-action" disabled={submitState.status === "loading"}>
            {submitState.status === "loading" ? <Loader2 className="spin" size={18} /> : <Send size={18} />}
            Submit Request
          </button>
        </form>

        <aside className="side-stack">
          {createdRequest && (
            <section className="panel">
              <h2>Last Submission</h2>
              <RequestSnapshot request={createdRequest} />
            </section>
          )}
        </aside>
      </section>
    </main>
  );
}

function RequestSnapshot({ request }) {
  return (
    <dl className="request-snapshot">
      <div>
        <dt>Request ID</dt>
        <dd>#{request.id}</dd>
      </div>
      <div>
        <dt>Status</dt>
        <dd><span className={`pill ${request.status || "pending"}`}>{request.status || "pending"}</span></dd>
      </div>
      <div>
        <dt>Current Step</dt>
        <dd>{request.current_step || "DM"}</dd>
      </div>
      <div>
        <dt>Leave Dates</dt>
        <dd>{formatDate(request.leave_start)} to {formatDate(request.leave_end)}</dd>
      </div>
    </dl>
  );
}

createRoot(document.getElementById("root")).render(<App />);
