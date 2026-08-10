# Copyright (c) 2026, Instacertify Labs Pvt Ltd and contributors
# For license information, please see license.txt

import frappe
from frappe.utils import add_days, now_datetime


def send_followup_reminders():
	"""Create notification logs for overdue / due-soon lead follow-ups."""
	due = frappe.get_all(
		"IC Lead",
		filters={
			"follow_up_on": ["<=", add_days(now_datetime(), 1)],
			"status": ["in", ["NEW", "CONTACTED", "FOLLOW_UP", "QUOTE_SENT"]],
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
