"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Panel } from "@/components/ui";
import { PROJECT_STATUSES, TASK_STATUSES, WAITING_FOR, labelStatus } from "@/lib/crm";

type UserOpt = { id: string; name: string };
type Project = {
  id: string;
  status: string;
  commercialOwnerId: string | null;
  deliveryOwnerId: string | null;
  waitingFor: string | null;
  waitingNote: string | null;
};

export function ProjectControls({
  project,
  users,
}: {
  project: Project;
  users: UserOpt[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(project.status);
  const [commercialOwnerId, setCommercialOwnerId] = useState(
    project.commercialOwnerId || "",
  );
  const [deliveryOwnerId, setDeliveryOwnerId] = useState(
    project.deliveryOwnerId || "",
  );
  const [waitingFor, setWaitingFor] = useState(project.waitingFor || "");
  const [waitingNote, setWaitingNote] = useState(project.waitingNote || "");
  const [remark, setRemark] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskStatus, setTaskStatus] = useState("TODO");
  const [taskWaitingFor, setTaskWaitingFor] = useState("Client");
  const [message, setMessage] = useState("");

  async function saveProject() {
    setBusy(true);
    setMessage("");
    const res = await fetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        commercialOwnerId: commercialOwnerId || null,
        deliveryOwnerId: deliveryOwnerId || null,
        waitingFor: waitingFor || null,
        waitingNote: waitingNote || null,
        remark: remark || undefined,
        stage: "Other",
      }),
    });
    setBusy(false);
    if (!res.ok) {
      setMessage("Could not save project");
      return;
    }
    setRemark("");
    setMessage("Project updated");
    router.refresh();
  }

  async function addTask() {
    if (!taskTitle.trim()) return;
    setBusy(true);
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: project.id,
        title: taskTitle,
        status: taskStatus,
        waitingFor: taskStatus === "WAITING" ? taskWaitingFor : null,
        assignedToId: deliveryOwnerId || null,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      setMessage("Could not add task");
      return;
    }
    setTaskTitle("");
    setMessage("Task added");
    router.refresh();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel>
        <h2 className="font-display text-xl font-semibold">Control tower actions</h2>
        <div className="mt-4 grid gap-3">
          <label className="grid gap-1 text-sm font-semibold">
            Status
            <select
              className="rounded-xl border border-brand-line px-3 py-2"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {PROJECT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {labelStatus(s)}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            Commercial owner
            <select
              className="rounded-xl border border-brand-line px-3 py-2"
              value={commercialOwnerId}
              onChange={(e) => setCommercialOwnerId(e.target.value)}
            >
              <option value="">Unassigned</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            Delivery owner
            <select
              className="rounded-xl border border-brand-line px-3 py-2"
              value={deliveryOwnerId}
              onChange={(e) => setDeliveryOwnerId(e.target.value)}
            >
              <option value="">Unassigned</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            Waiting for
            <select
              className="rounded-xl border border-brand-line px-3 py-2"
              value={waitingFor}
              onChange={(e) => setWaitingFor(e.target.value)}
            >
              <option value="">None</option>
              {WAITING_FOR.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            Waiting note
            <input
              className="rounded-xl border border-brand-line px-3 py-2"
              value={waitingNote}
              onChange={(e) => setWaitingNote(e.target.value)}
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            Log communication
            <textarea
              className="min-h-20 rounded-xl border border-brand-line px-3 py-2"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="Client confirmed sample dispatch..."
            />
          </label>
          <button
            type="button"
            className="btn primary"
            disabled={busy}
            onClick={saveProject}
          >
            Save project
          </button>
        </div>
      </Panel>

      <Panel>
        <h2 className="font-display text-xl font-semibold">Add task</h2>
        <div className="mt-4 grid gap-3">
          <label className="grid gap-1 text-sm font-semibold">
            Task
            <input
              className="rounded-xl border border-brand-line px-3 py-2"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="Collect manufacturer documents"
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            Status
            <select
              className="rounded-xl border border-brand-line px-3 py-2"
              value={taskStatus}
              onChange={(e) => setTaskStatus(e.target.value)}
            >
              {TASK_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {labelStatus(s)}
                </option>
              ))}
            </select>
          </label>
          {taskStatus === "WAITING" ? (
            <label className="grid gap-1 text-sm font-semibold">
              Waiting for
              <select
                className="rounded-xl border border-brand-line px-3 py-2"
                value={taskWaitingFor}
                onChange={(e) => setTaskWaitingFor(e.target.value)}
              >
                {WAITING_FOR.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <button type="button" className="btn accent" disabled={busy} onClick={addTask}>
            Add task
          </button>
          {message ? <p className="text-sm font-semibold text-brand-teal">{message}</p> : null}
        </div>
      </Panel>
    </div>
  );
}
