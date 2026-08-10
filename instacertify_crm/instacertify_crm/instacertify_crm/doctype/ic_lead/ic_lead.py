# Copyright (c) 2026, Instacertify Labs Pvt Ltd and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class ICLead(Document):
	def validate(self):
		if self.country == "India" and not self.state:
			frappe.throw("State is required when Country is India")

	def on_update(self):
		_sync_last_contact(self)
		_notify_admins_on_assignment_change(self)


def _sync_last_contact(doc):
	if not doc.logs:
		return
	latest = max((row.log_time for row in doc.logs if row.log_time), default=None)
	if latest and doc.last_contact_on != latest:
		frappe.db.set_value("IC Lead", doc.name, "last_contact_on", latest, update_modified=False)


def _notify_admins_on_assignment_change(doc):
	"""Keep IC Admins aware when leads move between team members."""
	if doc.is_new():
		return
	before = doc.get_doc_before_save()
	if not before:
		return
	old_assignee = before.assigned_to or ""
	new_assignee = doc.assigned_to or ""
	old_status = before.status or ""
	new_status = doc.status or ""
	if old_assignee == new_assignee and old_status == new_status:
		return

	admins = {
		row.parent
		for row in frappe.get_all(
			"Has Role",
			filters={"role": ["in", ["IC Admin", "System Manager"]]},
			fields=["parent"],
		)
	}
	admins.discard("Administrator")
	admins.discard("Guest")
	admins.discard(frappe.session.user)

	if not admins:
		return

	assignee_label = (
		frappe.db.get_value("User", new_assignee, "full_name") if new_assignee else "Unassigned"
	)
	subject = f"Lead update — {doc.company}"
	parts = [f"{doc.name} ({doc.customer_name} / {doc.company})"]
	if old_assignee != new_assignee:
		parts.append(f"Assigned to: {assignee_label or new_assignee or 'Unassigned'}")
	if old_status != new_status:
		parts.append(f"Status: {old_status} → {new_status}")
	message = " · ".join(parts)

	for user in admins:
		note = frappe.new_doc("Notification Log")
		note.for_user = user
		note.type = "Alert"
		note.document_type = "IC Lead"
		note.document_name = doc.name
		note.subject = subject
		note.email_content = message
		note.insert(ignore_permissions=True)
