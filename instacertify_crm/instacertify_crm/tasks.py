# Copyright (c) 2026, Instacertify Labs Pvt Ltd and contributors
# For license information, please see license.txt

import frappe
from frappe.utils import add_days, getdate, now_datetime, today


def send_followup_reminders():
	"""Create notification logs for overdue / due-soon lead follow-ups."""
	due = frappe.get_all(
		"IC Lead",
		filters={
			"follow_up_on": ["<=", add_days(now_datetime(), 1)],
			"status": ["in", ["NEW", "CONTACTED", "QUALIFIED", "QUOTATION", "NEGOTIATION"]],
		},
		fields=["name", "customer_name", "company", "follow_up_on", "owner", "assigned_to"],
	)
	for lead in due:
		targets = {lead.owner, lead.assigned_to}
		for user in targets:
			if not user or user in {"Guest", "Administrator"}:
				continue
			note = frappe.new_doc("Notification Log")
			note.for_user = user
			note.type = "Alert"
			note.document_type = "IC Lead"
			note.document_name = lead.name
			note.subject = f"Follow-up due: {lead.customer_name}"
			note.email_content = f"{lead.company} follow-up is due on {lead.follow_up_on}"
			note.insert(ignore_permissions=True)


def send_renewal_reminders():
	"""Notify users about certification renewals due today or overdue."""
	if not frappe.db.exists("DocType", "IC Renewal Reminder"):
		return

	due = frappe.get_all(
		"IC Renewal Reminder",
		filters={
			"status": "Scheduled",
			"remind_on": ["<=", today()],
		},
		fields=[
			"name",
			"title",
			"customer_name",
			"company",
			"remind_on",
			"interval_label",
			"assigned_to",
			"owner",
			"lead",
			"service",
		],
	)
	for row in due:
		targets = {row.owner, row.assigned_to}
		if row.lead:
			lead_owner = frappe.db.get_value("IC Lead", row.lead, ["owner", "assigned_to"], as_dict=True)
			if lead_owner:
				targets.add(lead_owner.owner)
				targets.add(lead_owner.assigned_to)
		for user in targets:
			if not user or user in {"Guest", "Administrator"}:
				continue
			note = frappe.new_doc("Notification Log")
			note.for_user = user
			note.type = "Alert"
			note.document_type = "IC Renewal Reminder"
			note.document_name = row.name
			note.subject = f"Certification renewal due: {row.customer_name or row.title}"
			note.email_content = (
				f"{row.company or ''} · {row.interval_label} reminder on {getdate(row.remind_on)}"
				+ (f" · {row.service}" if row.service else "")
			)
			note.insert(ignore_permissions=True)
		frappe.db.set_value(
			"IC Renewal Reminder",
			row.name,
			{"status": "Notified", "notified_on": now_datetime()},
			update_modified=True,
		)
